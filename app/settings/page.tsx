'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Download, Trash2, LogOut, Shield, ToggleLeft, ToggleRight,
  User, Brain, AlertTriangle,
} from 'lucide-react';
import type { Profile } from '@/lib/types';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [extractionEnabled, setExtractionEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? '');

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setExtractionEnabled(data.memory_extraction_enabled ?? true);
    }
  }

  async function toggleExtraction() {
    if (!profile) return;
    setSaving(true);
    const next = !extractionEnabled;
    setExtractionEnabled(next);
    await supabase
      .from('profiles')
      .update({ memory_extraction_enabled: next })
      .eq('user_id', profile.user_id);
    setSaving(false);
  }

  async function exportData() {
    const res = await fetch('/api/settings/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindtrace-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (deleteInput !== 'DELETE') return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete all user data (RLS cascade handles DB rows)
    await supabase.from('memories').delete().eq('user_id', user.id);
    await supabase.from('journal_entries').delete().eq('user_id', user.id);
    await supabase.from('chat_messages').delete().eq('user_id', user.id);
    await supabase.from('habits').delete().eq('user_id', user.id);
    await supabase.from('memory_summary').delete().eq('user_id', user.id);
    await supabase.from('token_usage_logs').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('user_id', user.id);
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and memory preferences.</p>
      </div>

      {/* Account Section */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-base font-semibold">Account</h2>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{userEmail || '—'}</p>
          </div>
        </div>

        {profile && (
          <>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">Display name</p>
                <p className="text-sm text-muted-foreground">{profile.display_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">AI tone preference</p>
                <p className="text-sm text-muted-foreground capitalize">{profile.tone_preference}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium">Focus areas</p>
                <p className="text-sm text-muted-foreground">
                  {profile.focus_areas?.join(', ') || 'Not set'}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="pt-1">
          <button
            onClick={handleSignOut}
            className="btn btn-ghost text-sm border border-border"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </section>

      {/* Memory Controls */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-base font-semibold">Memory Controls</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium">Memory extraction</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When enabled, facts are automatically extracted from your journal entries.
              Toggle off for private entries.
            </p>
          </div>
          <button
            onClick={toggleExtraction}
            disabled={saving}
            className="flex-shrink-0 transition-colors disabled:opacity-50"
          >
            {extractionEnabled ? (
              <ToggleRight className="w-10 h-10 text-accent" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-muted-foreground" />
            )}
          </button>
        </div>

        <div className="pt-1 p-3 rounded-lg text-xs leading-relaxed"
          style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}>
          <p>
            <strong>How memory works:</strong> Each journal entry is analyzed to extract structured facts (preferences,
            goals, relationships, habits). These are stored with a confidence score and used to personalize AI responses —
            never the raw text of your entries.
          </p>
        </div>
      </section>

      {/* Data Management */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-base font-semibold">Data Management</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Export your data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download all your memories, entries, habits, and chat history as JSON.
            </p>
          </div>
          <button onClick={exportData} className="btn btn-ghost border border-border text-sm flex-shrink-0">
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="card p-5 border-destructive/20 border space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h2 className="font-serif text-base font-semibold text-destructive">Danger Zone</h2>
        </div>

        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes your account, all memories, journal entries, habits, and chat history.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-destructive text-sm flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm">
              This cannot be undone. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 rounded-lg border border-destructive/40 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/30 bg-card"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteInput !== 'DELETE'}
                className="btn btn-destructive disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
