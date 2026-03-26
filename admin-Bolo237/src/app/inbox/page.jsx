"use client";

import { useEffect, useState } from 'react';

export default function AdminInbox() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Le radar tourne : on va chercher les emails sur ton API Render
    fetch('https://api-237jobs.onrender.com/api/admin/emails')
      .then((res) => res.json())
      .then((data) => {
        setEmails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur de connexion au radar :", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6 text-center">🔄 Chargement des correspondances...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📥 Centre de Commandement - Emails</h2>

      <div className="space-y-4">
        {emails.length === 0 ? (
          <p className="text-gray-500 italic">La boîte de réception est vide pour le moment.</p>
        ) : (
          emails.map((email) => (
            <div key={email.id} className="border p-4 rounded-lg shadow-sm bg-white">

              {/* En-tête de l'email */}
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <div>
                  <span className="font-bold text-blue-600">
                    {email.senderEmail}
                  </span>
                </div>
                <div className="text-sm text-gray-500 text-right">
                  {new Date(email.createdAt).toLocaleString('fr-FR')}
                  <br />
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${email.status === 'UNREAD' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {email.status === 'UNREAD' ? 'Non Lu' : email.status}
                  </span>
                </div>
              </div>

              {/* Sujet et Corps du message */}
              <h3 className="text-lg font-bold mb-2">{email.subject}</h3>
              <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {email.body}
              </p>

              {/* Bouton d'action futur */}
              <div className="mt-4 flex justify-end">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors">
                  Répondre
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
