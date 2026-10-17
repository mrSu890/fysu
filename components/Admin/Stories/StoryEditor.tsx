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
      const { data: pages } = await supabase
        .from("pages")
        .select("id, title");

      const { data: collections } = await supabase
        .from("collectionPages")
        .select("id, title");

      const formatted = [
        ...(pages || []).map((p) => ({
          label: `Page • ${p.title}`,
          value: `page:${p.id}`,
        })),
        ...(collections || []).map((c) => ({
          label: `Collection • ${c.title}`,
          value: `collection:${c.id}`,
        })),
      ];

      setPageOptions(formatted);
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
      const { data } = await supabase
        .from("story_page_links")
        .select("*")
        .eq("story_id", editingStory.id);
  
      if (!data) return;
  
      const formatted = data.map((link) => {
        if (link.page_id) {
          return { type: "page", id: link.page_id };
        }
        if (link.collection_page_id) {
          return { type: "collection", id: link.collection_page_id };
        }
        return null;
      }).filter(Boolean);
  
      setTargets(formatted as PageTarget[]);
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

  const uploadToSupabase = async (file: File, bucket: string) => {
    const hide = message.loading("Envoi en cours…", 0);
    try {
      const res = await fetch("/api/admin/stories/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, filename: file.name }),
      });
      const sig = await res.json().catch(() => null);
      if (!res.ok || !sig) throw new Error(sig?.error || `Erreur ${res.status}`);

      const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(sig.path, sig.token, file, {
          contentType: file.type || undefined,
        });
      if (error) throw new Error(error.message);

      return sig.url as string;
    } catch (e) {
      message.error(
        "Envoi impossible : " + (e instanceof Error ? e.message : "erreur")
      );
      return null;
    } finally {
      hide();
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