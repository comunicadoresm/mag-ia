import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Calendar, Pencil, Check, X, Loader2, Coins, ChevronRight, AtSign, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MainSidebar } from '@/components/MainSidebar';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [handleValue, setHandleValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentHandle, setCurrentHandle] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile?.name) setNameValue(profile.name);
  }, [profile?.name]);

  // Fetch handle from user_metrics
  useEffect(() => {
    if (!user) return;
    supabase.from('user_metrics').select('handle').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.handle) {
        setCurrentHandle(data.handle);
        setHandleValue(data.handle);
      }
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: nameValue.trim() }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setIsEditingName(false);
      toast.success('Nome atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Erro ao atualizar o nome');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveHandle = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('user_metrics').update({ handle: handleValue.trim() }).eq('user_id', user.id);
      if (error) throw error;
      setCurrentHandle(handleValue.trim());
      setIsEditingHandle(false);
      toast.success('@ atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating handle:', error);
      toast.error('Erro ao atualizar o @');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const memberSince = profile?.created_at
    ? format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })
    : 'N/A';

  return (
    <div className="min-h-screen bg-background">
      <MainSidebar />

      <main className="md:ml-64 pb-24 md:pb-8">
        <header className="md:hidden p-4 border-b border-border">
          <Logo size="sm" />
        </header>

        <div className="p-4 md:p-8 max-w-md mx-auto md:mx-0">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold mb-4">
              {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Editable Name */}
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="text-center text-xl font-bold" placeholder="Seu nome" autoFocus />
                <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSaving} className="text-success hover:text-success">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setNameValue(profile?.name || ''); setIsEditingName(false); }} disabled={isSaving} className="text-destructive hover:text-destructive">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{profile?.name || 'Adicione seu nome'}</h1>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="space-y-3 mb-8">
            {/* Instagram Handle - Editable */}
            <div className="card-cm p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <AtSign className="w-5 h-5 text-primary" />
              </div>
              {isEditingHandle ? (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Input value={handleValue} onChange={(e) => setHandleValue(e.target.value)} className="text-sm" placeholder="@seuarroba" autoFocus />
                  <Button size="icon" variant="ghost" onClick={handleSaveHandle} disabled={isSaving} className="text-success hover:text-success shrink-0">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setHandleValue(currentHandle); setIsEditingHandle(false); }} disabled={isSaving} className="text-destructive hover:text-destructive shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">@ do Instagram</p>
                    <p className="text-sm font-medium text-foreground truncate">{currentHandle || 'Adicione seu @'}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingHandle(true)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="card-cm p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">{profile?.email || user.email}</p>
              </div>
            </div>

            <div className="card-cm p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Membro desde</p>
                <p className="text-sm font-medium text-foreground">{memberSince}</p>
              </div>
            </div>
          </div>

          {/* Credits Link */}
          <button onClick={() => navigate('/profile/credits')} className="card-cm p-4 flex items-center gap-3 w-full text-left mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Créditos</p>
              <p className="text-sm font-medium text-foreground">Ver meus créditos e consumo</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Sign Out Button */}
          <Button onClick={handleSignOut} variant="outline" className="w-full h-14 gap-2 border-destructive/20 text-destructive hover:bg-destructive/10">
            <LogOut className="w-5 h-5" />
            Sair da conta
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-8">CM Chat v1.0.0</p>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}
