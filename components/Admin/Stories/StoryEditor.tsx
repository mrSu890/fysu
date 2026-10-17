"use client";

import { useEffect, useState } from "react";
import {
  Form,
  Input,
  Upload,
  Button,
  Card,
  Select,
  Space,
  InputNumber,
  Switch,
  Typography,
  Divider,
  message,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseClient } from "@/lib/supabaseClient";
import { optimizeStoryMedia } from "@/lib/storyMedia";
import { putSigned, withTimeout } from "@/lib/signedUpload";

const { Title } = Typography;

type StoryItem = {
  type: "image" | "video";
  media_url: string;
  duration: number;
};

type PageTarget = {
  type: "page" | "collection";
  id: string;
};

type Story = {
  id: string;
  title: string;
  cover_url: string;
  is_active: boolean;
  story_items: StoryItem[];
};

type Props = {
  editingStory?: Story | null;
  onFinishEdit?: () => void;
  onSaved?: () => void;
};

export default function StoryEditor({
  editingStory,
  onFinishEdit,
  onSaved,
}: Props) {
  const supabase = supabaseClient;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StoryItem[]>([]);
  const [targets, setTargets] = useState<PageTarget[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [pageOptions, setPageOptions] = useState<any[]>([]);

  /* -------------------------------------------------- */
  /* FETCH PAGE OPTIONS */
  /* -------------------------------------------------- */

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch("/api/admin/stories/targets", { cache: "no-store" });
        const d = await res.json();
        const formatted = [
          ...(d.pages || []).map((p: any) => ({
            label: `Page • ${p.label}`,
            value: `page:${p.id}`,
          })),
          ...(d.collections || []).map((c: any) => ({
            label: `Collection • ${c.label}`,
            value: `collection:${c.id}`,
          })),
        ];
        setPageOptions(formatted);
        if (d.errors?.length) message.error("Liste des pages : " + d.errors[0]);
      } catch {
        message.error("Impossible de charger la liste des pages");
      }
    };

    fetchPages();
  }, []);

  useEffect(() => {
    if (!editingStory) {
      form.resetFields();
      setItems([]);
      setTargets([]);
      setCoverUrl(null);
      return;
    }
  
    form.setFieldsValue({
      title: editingStory.title,
      is_active: editingStory.is_active,
    });
  
    setCoverUrl(editingStory.cover_url);
    setItems(editingStory.story_items || []);
  
    const fetchLinks = async () => {
      try {
        const res = await fetch(
          `/api/admin/stories/targets?story=${editingStory.id}`,
          { cache: "no-store" }
        );
        const d = await res.json();
        const formatted = (d.links || [])
          .map((link: any) => {
            if (link.page_id) return { type: "page", id: link.page_id };
            if (link.collection_page_id)
              return { type: "collection", id: link.collection_page_id };
            return null;
          })
          .filter(Boolean);
        setTargets(formatted as PageTarget[]);
      } catch {}
    };

    fetchLinks();
  
  }, [editingStory]);

  /* -------------------------------------------------- */
  /* LOAD EDIT MODE */
  /* -------------------------------------------------- */

  useEffect(() => {
    if (!editingStory) {
      form.resetFields();
      setItems([]);
      setTargets([]);
      setCoverUrl(null);
      return;
    }

    form.setFieldsValue({
      title: editingStory.title,
      is_active: editingStory.is_active,
    });

    setCoverUrl(editingStory.cover_url);
    setItems(editingStory.story_items || []);
  }, [editingStory]);

  /* -------------------------------------------------- */
  /* STORAGE */
  /* -------------------------------------------------- */

  const uploadToSupabase = async (original: File, bucket: string) => {
    const key = "story-upload";
    message.loading({ content: "Allègement du fichier…", key, duration: 0 });
    try {
      // photo -> 1080 px / vidéo -> 720 px (jamais bloqué : au pire on garde le fichier d'origine)
      const isVideo = original.type.startsWith("video/");
      const file = await withTimeout(
        optimizeStoryMedia(original, bucket === "story-covers" ? "cover" : "media"),
        isVideo ? 180000 : 20000,
        original
      );

      let url: string;
      if (file.size <= 4 * 1024 * 1024) {
        // fichier léger : même chemin que les autres envois de l'admin
        message.loading({ content: "Envoi en cours…", key, duration: 0 });
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", bucket);
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 60000);
        let res: Response;
        try {
          res = await fetch("/api/admin/stories/upload", {
            method: "POST",
            body: fd,
            signal: ctrl.signal,
          });
        } finally {
          window.clearTimeout(timer);
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.url) {
          throw new Error(data?.error || `Erreur ${res.status}`);
        }
        url = data.url;
      } else {
        // gros fichier (vidéo) : envoi direct vers Supabase, avec pourcentage
        if (file.size > 48 * 1024 * 1024) {
          throw new Error("Fichier trop lourd (max 48 Mo). Raccourcis la vidéo.");
        }
        const res = await fetch("/api/admin/stories/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bucket, filename: file.name }),
        });
        const sig = await res.json().catch(() => null);
        if (!res.ok || !sig?.signedUrl) {
          throw new Error(sig?.error || `Erreur ${res.status}`);
        }
        await putSigned(sig.signedUrl, file, (pct) =>
          message.loading({ content: `Envoi… ${pct} %`, key, duration: 0 })
        );
        url = sig.url;
      }

      message.destroy(key);
      return url;
    } catch (e) {
      message.destroy(key);
      message.error(
        "Envoi impossible : " + (e instanceof Error ? e.message : "erreur")
      );
      return null;
    }
  };

  const handleCoverUpload = async (file: File) => {
    const url = await uploadToSupabase(file, "story-covers");
    if (url) {
      setCoverUrl(url);
      message.success("Cover uploaded");
    }
    return false;
  };

  const handleMediaUpload = async (file: File, index: number) => {
    const url = await uploadToSupabase(file, "story-media");
    if (!url) return false;

    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, media_url: url } : item
      )
    );

    message.success("Media uploaded");
    return false;
  };

  /* -------------------------------------------------- */
  /* SUBMIT */
  /* -------------------------------------------------- */

  const handleSubmit = async (values: any) => {
    if (!coverUrl) {
      message.error("Cover required");
      return;
    }

    setLoading(true);

    try {
      const method = editingStory ? "PUT" : "POST";

      const res = await fetch("/api/admin/stories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingStory?.id,
          title: values.title,
          cover_url: coverUrl,
          is_active: values.is_active,
          items,
          targets,
        }),
      });

      if (!res.ok) throw new Error();

      message.success(
        editingStory
          ? "Story updated 🎉"
          : "Story created 🎉"
      );

      form.resetFields();
      setItems([]);
      setTargets([]);
      setCoverUrl(null);

      if (editingStory && onFinishEdit) {
        onFinishEdit();
      }

      if (onSaved) {
        onSaved(); // 🔥 refresh manager
      }

    } catch {
      message.error("Error saving story");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /* RENDER */
  /* -------------------------------------------------- */

  return (
    <Card className="shadow-lg rounded-2xl">
      <Title level={3}>
        {editingStory
          ? "Modifier la Story"
          : "Créer une Story"}
      </Title>

      {editingStory && (
        <Button
          danger
          size="small"
          onClick={() => onFinishEdit?.()}
          className="mb-4"
        >
          Annuler modification
        </Button>
      )}

      <Form
        layout="vertical"
        form={form}
        onFinish={handleSubmit}
        initialValues={{ is_active: true }}
      >
        <Form.Item
          label="Titre"
          name="title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Active"
          name="is_active"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Form.Item label="Cover Image">
          <Upload
            beforeUpload={handleCoverUpload}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>
              Upload Cover
            </Button>
          </Upload>

          {coverUrl && (
            <img
              src={coverUrl}
              className="mt-3 w-24 h-24 rounded-full object-cover"
            />
          )}
        </Form.Item>

        <Divider />

        <Title level={4}>Slides</Title>

        <AnimatePresence>
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="mb-4">
                <Space direction="vertical" className="w-full">
                  <Select
                    value={item.type}
                    onChange={(value) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? { ...it, type: value }
                            : it
                        )
                      )
                    }
                    options={[
                      { label: "Image", value: "image" },
                      { label: "Video", value: "video" },
                    ]}
                  />

                  <Upload
                    beforeUpload={(file) =>
                      handleMediaUpload(file, index)
                    }
                    showUploadList={false}
                  >
                    <Button icon={<UploadOutlined />}>
                      Upload Media
                    </Button>
                  </Upload>

                  {item.media_url && (
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-black">
                      {item.type === "image" ? (
                        <img
                          src={item.media_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.media_url}
                          className="w-full h-full object-cover"
                          muted
                          autoPlay
                          loop
                          playsInline
                        />
                      )}
                    </div>
                  )}

                  <InputNumber
                    min={1}
                    max={30}
                    value={item.duration}
                    onChange={(value) =>
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === index
                            ? {
                                ...it,
                                duration: Number(value),
                              }
                            : it
                        )
                      )
                    }
                  />

                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      setItems(items.filter((_, i) => i !== index))
                    }
                  >
                    Remove Slide
                  </Button>
                </Space>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            setItems([
              ...items,
              { type: "image", media_url: "", duration: 5 },
            ])
          }
          className="mb-6"
        >
          Add Slide
        </Button>

        <Divider />

        <Title level={4}>Afficher sur</Title>

        <Select
          mode="multiple"
          placeholder="Choisir les pages"
          className="w-full mb-6"
          options={pageOptions}
          value={targets.map((t) => `${t.type}:${t.id}`)}
          onChange={(values) => {
            const mapped = values.map((v: string) => {
              const [type, id] = v.split(":");
              return { type, id } as PageTarget;
            });
            setTargets(mapped);
          }}
        />

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          {editingStory ? "Update Story" : "Save Story"}
        </Button>
      </Form>
    </Card>
  );
}