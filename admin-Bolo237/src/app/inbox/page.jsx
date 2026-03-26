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
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

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

  function openReplyModal(email) {
    setSelectedEmail(email);
    setReplyMessage("");
    setNotice("");
  }

  function closeReplyModal() {
    if (replyingId) return;
    setSelectedEmail(null);
    setReplyMessage("");
  }

  async function sendReply() {
    if (!selectedEmail || !replyMessage.trim()) return;

    setReplyingId(selectedEmail.id);
    setNotice("");

    try {
      const result = await replyToAdminEmail({
        ticketId: selectedEmail.id,
        replyMessage: replyMessage.trim(),
        customerEmail: selectedEmail.senderEmail,
        subject: selectedEmail.subject || "Sans sujet",
      });

      setEmails((prev) =>
        prev.map((item) =>
          item.id === selectedEmail.id ? { ...item, status: "READ" } : item
        )
      );
      setNotice(result.message || "Reponse envoyee.");
      closeReplyModal();
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
                    onClick={() => openReplyModal(email)}
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

      {selectedEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 px-6 py-4">
              <p className="text-sm font-medium text-zinc-500">Reponse a</p>
              <p className="truncate text-base font-semibold text-zinc-900">
                {selectedEmail.senderEmail}
              </p>
              <p className="mt-1 truncate text-sm text-zinc-600">
                Re: {selectedEmail.subject || "Sans sujet"}
              </p>
            </div>

            <div className="px-6 py-4">
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Message
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={8}
                placeholder="Ecris ta reponse ici..."
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
              <button
                onClick={closeReplyModal}
                disabled={Boolean(replyingId)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={sendReply}
                disabled={!replyMessage.trim() || Boolean(replyingId)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#8B4332] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7A3A2B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageSquare className="h-4 w-4" />
                {replyingId ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
