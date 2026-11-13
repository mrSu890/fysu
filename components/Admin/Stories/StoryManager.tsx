"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Space,
  Button,
  Switch,
  Divider,
  Popconfirm,
  message,
  Tag,
  Spin,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseClient } from "@/lib/supabaseClient";

const { Title } = Typography;

export type Story = {
  id: string;
  title: string;
  cover_url: string;
  is_active: boolean;
  story_items: any[];
  created_at: string;
};

type Props = {
  onEdit?: (story: Story) => void;
  refreshKey?: number; // Permet de forcer refresh depuis parent
};

export default function StoryManager({ onEdit, refreshKey }: Props) {
  const supabase = supabaseClient;

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  /* -------------------------------------------------- */
  /* FETCH STORIES */
  /* -------------------------------------------------- */

  const fetchStories = async () => {
    setLoading(true);
  
    try {
      const res = await fetch("/api/admin/stories", { cache: "no-store" });
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data?.error || "Erreur chargement stories");
      }
  
      setStories(data || []);
    } catch (err) {
      console.error(err);
      message.error("Erreur chargement stories");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchStories();
  }, [refreshKey]);

  /* -------------------------------------------------- */
  /* DELETE */
  /* -------------------------------------------------- */

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/stories?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      message.success("Story supprimée");
      fetchStories();
    } else {
      message.error("Erreur suppression");
    }
  };

  /* -------------------------------------------------- */
  /* TOGGLE ACTIVE */
  /* -------------------------------------------------- */

  const toggleActive = async (story: Story) => {
    const { error } = await supabase
      .from("stories")
      .update({ is_active: !story.is_active })
      .eq("id", story.id);

    if (error) {
      message.error("Erreur update");
      return;
    }

    setStories((prev) =>
      prev.map((s) =>
        s.id === story.id
          ? { ...s, is_active: !s.is_active }
          : s
      )
    );

    message.success("Statut mis à jour");
  };

  /* -------------------------------------------------- */
  /* RENDER */
  /* -------------------------------------------------- */

  return (
    <Card className="shadow-lg rounded-2xl mt-10">
      <Title level={3}>Gestion des Stories</Title>

      <Divider />

      {loading ? (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      ) : (
        <Space orientation="vertical" className="w-full">
          <AnimatePresence>
            {stories.map((story) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card size="small">
                  <div className="flex justify-between items-center">

                    {/* LEFT */}
                    <div className="flex items-center gap-4">
                      <img
                        src={story.cover_url}
                        className="w-14 h-14 rounded-full object-cover"
                      />

                      <div>
                        <div className="font-semibold">
                          {story.title}
                        </div>

                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          <span>
                            {story.story_items?.length || 0} slides
                          </span>

                          <Tag color={story.is_active ? "green" : "red"}>
                            {story.is_active ? "Active" : "Inactive"}
                          </Tag>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT */}
                    <Space>
                      <Switch
                        checked={story.is_active}
                        onChange={() => toggleActive(story)}
                      />

                      {onEdit && (
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => onEdit(story)}
                        />
                      )}

                      <Popconfirm
                        title="Supprimer cette story ?"
                        onConfirm={() => handleDelete(story.id)}
                        okText="Oui"
                        cancelText="Non"
                      >
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {stories.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-6">
              Aucune story créée
            </div>
          )}
        </Space>
      )}
    </Card>
  );
}