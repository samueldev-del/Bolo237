"use client";

import { useEffect, useState } from "react";
import { Loader2, Inbox, MessageSquare } from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { fetchAdminEmails, replyToAdminEmail } from "@/lib/api";

export default function AdminInbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchAdminEmails()
      .then((data) => {
        setEmails(data);
      })
      .catch((err) => {
        console.error("Erreur de connexion a la boite de reception:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleReply(email) {
    const replyMessage = window.prompt(
      `Reponse a envoyer a ${email.senderEmail}:`
    );

    if (!replyMessage || !replyMessage.trim()) return;

    setReplyingId(email.id);
    setNotice("");

    try {
      const result = await replyToAdminEmail({
        ticketId: email.id,
        replyMessage: replyMessage.trim(),
        customerEmail: email.senderEmail,
        subject: email.subject || "Sans sujet",
      });

      setEmails((prev) =>
        prev.map((item) =>
          item.id === email.id ? { ...item, status: "READ" } : item
        )
      );
      setNotice(result.message || "Reponse envoyee.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setReplyingId(null);
    }
  }

  return (
    <AdminShell
      title="Boite de Reception"
      description="Tous les emails recus via la plateforme."
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {notice ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
              {notice}
            </div>
          ) : null}

          {emails.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
              <Inbox className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                La boite de reception est vide pour le moment.
              </p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-800">
                      {email.senderEmail}
                    </p>
                    <p className="mt-1 text-lg font-bold text-zinc-900">
                      {email.subject || "(Sans sujet)"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-zinc-500">
                      {new Date(email.createdAt).toLocaleString("fr-FR")}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        email.status === "UNREAD"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {email.status === "UNREAD" ? "Non lu" : email.status}
                    </span>
                  </div>
                </div>

                <p className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700">
                  {email.body}
                </p>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleReply(email)}
                    disabled={replyingId === email.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#8B4332] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7A3A2B] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {replyingId === email.id ? "Envoi..." : "Repondre"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AdminShell>
  );
}
