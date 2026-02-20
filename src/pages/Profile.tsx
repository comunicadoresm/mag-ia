import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Mail, Pencil, Check, X, Loader2, Coins, ChevronRight, AtSign, Camera, User, Crown, Mic, BookOpen, FileText, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VoiceDNASetup } from '@/components/onboarding/VoiceDNASetup';
import { FormatQuizSetup } from '@/components/onboarding/FormatQuizSetup';
import { NarrativeSetup } from '@/components/onboarding/NarrativeSetup';

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [handleValue, setHandleValue] = useState('');
  const [currentHandle, setCurrentHandle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ name: string; color: string } | null>(null);
  const [voiceProfile, setVoiceProfile] = useState<any>(null);
  const [narrative, setNarrative] = useState<any>(null);
  const [formatProfile, setFormatProfile] = useState<any>(null);
  const [activeOnboarding, setActiveOnboarding] = useState<'voice_dna' | 'format_quiz' | 'narrative' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading && !user) navigate('/login'); }, [user, authLoading, navigate]);
  useEffect(() => { if (profile?.name) setNameValue(profile.name); }, [profile?.name]);
  useEffect(() => {
    if (!user) return;
    supabase.from('user_metrics').select('handle, profile_photo_url').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.handle) { setCurrentHandle(data.handle); setHandleValue(data.handle); }
      if (data?.profile_photo_url) setPhotoUrl(data.profile_photo_url);
    });
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    const planId = profile.plan_type_id;
    const planSlug = profile.plan_type;

    if (planId) {
      supabase.from('plan_types').select('name, color').eq('id', planId).single().then(({ data }) => {
        if (data) setPlanInfo(data);
      });
    } else if (planSlug && planSlug !== 'none') {
      supabase.from('plan_types').select('name, color').eq('slug', planSlug).single().then(({ data }) => {
        if (data) setPlanInfo(data);
      });
    }
  }, [profile?.plan_type_id, profile?.plan_type]);


  useEffect(() => {
    if (!user) return;
    supabase.from('voice_profiles').select('voice_dna, is_calibrated, calibration_score').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setVoiceProfile(data);
    });
    supabase.from('user_narratives').select('narrative_text, is_completed, expertise').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setNarrative(data);
    });
    supabase.from('user_format_profile').select('recommended_format, quiz_score').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setFormatProfile(data);
    });
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: nameValue.trim() }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setIsEditingName(false);
      toast.success('Nome atualizado!');
    } catch { toast.error('Erro ao atualizar o nome'); }
    finally { setIsSaving(false); }
  };

  const handleSaveHandle = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('user_metrics').update({ handle: handleValue.trim() }).eq('user_id', user.id);
      if (error) throw error;
      setCurrentHandle(handleValue.trim());
      setIsEditingHandle(false);
      toast.success('@ atualizado!');
    } catch { toast.error('Erro ao atualizar o @'); }
    finally { setIsSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('user_metrics').update({ profile_photo_url: url }).eq('user_id', user.id);
      setPhotoUrl(url);
      toast.success('Foto atualizada!');
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); }
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }



  const isMagnetic = profile?.plan_type === 'magnetic' || profile?.plan_type === 'magnetic_pro' || profile?.plan_type === 'magnetico' || profile?.plan_type === 'magnetico_pro' || voiceProfile || narrative || formatProfile;

  return (
    <AppLayout>
      {/* Onboarding modals */}
      {activeOnboarding === 'voice_dna' && (
        <VoiceDNASetup open onComplete={() => setActiveOnboarding(null)} onSkip={() => setActiveOnboarding(null)} />
      )}
      {activeOnboarding === 'format_quiz' && (
        <FormatQuizSetup open onComplete={() => setActiveOnboarding(null)} onSkip={() => setActiveOnboarding(null)} />
      )}
      {activeOnboarding === 'narrative' && (
        <NarrativeSetup open onComplete={() => setActiveOnboarding(null)} onSkip={() => setActiveOnboarding(null)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-4 px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Perfil</h1>
              <p className="text-xs text-muted-foreground">Suas informações pessoais</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6 pb-24 md:pb-6">
        <div className="max-w-md mx-auto">

          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative cursor-pointer mb-4" onClick={() => fileRef.current?.click()}>
              <Avatar className="w-24 h-24 border-2 border-primary">
                <AvatarImage src={photoUrl} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">{profile?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                {uploading ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Camera className="w-4 h-4 text-primary-foreground" />}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="text-center text-xl font-bold" placeholder="Seu nome" autoFocus />
                <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</Button>
                <Button size="icon" variant="ghost" onClick={() => { setNameValue(profile?.name || ''); setIsEditingName(false); }} disabled={isSaving}><X className="w-4 h-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{profile?.name || 'Adicione seu nome'}</h1>
                <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-4 h-4" /></Button>
              </div>
            )}
          </div>

          {/* ── Identidade Magnética ── */}
          {isMagnetic && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Identidade Magnética
              </h2>
              <div className="space-y-3">

                {/* Voice DNA */}
                <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">DNA de Voz</p>
                    <p className="text-sm font-medium text-foreground">
                      {voiceProfile?.is_calibrated ? (
                        <span className="text-green-500">✅ Calibrado{voiceProfile.calibration_score ? ` (nota ${voiceProfile.calibration_score})` : ''}</span>
                      ) : voiceProfile?.voice_dna ? (
                        <span className="text-yellow-500">⏳ Pendente de validação</span>
                      ) : (
                        <span className="text-muted-foreground">Não configurado</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveOnboarding('voice_dna')}
                    className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
                  >
                    {voiceProfile?.is_calibrated ? 'Reconfigurar' : 'Configurar'}
                  </button>
                </div>

                {/* Narrative */}
                <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Narrativa Primária</p>
                      <p className="text-sm font-medium text-foreground">
                        {narrative?.is_completed ? (
                          <span className="text-green-500">✅ Completa</span>
                        ) : (
                          <span className="text-muted-foreground">Não configurada</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveOnboarding('narrative')}
                      className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
                    >
                      {narrative?.is_completed ? 'Reconfigurar' : 'Configurar'}
                    </button>
                  </div>
                  {/* Exibir texto completo da narrativa quando disponível */}
                  {narrative?.narrative_text && (
                    <div className="border-t border-border/20 pt-3">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Sua Narrativa</p>
                      <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line space-y-1">
                        {narrative.narrative_text
                          .split('\n')
                          .filter((line: string) => line.trim())
                          .map((line: string, i: number) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Format Profile */}
                <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Formato Recomendado</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatProfile?.recommended_format ? (
                        <span className="text-green-500">✅ {formatProfile.recommended_format}</span>
                      ) : (
                        <span className="text-muted-foreground">Não configurado</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveOnboarding('format_quiz')}
                    className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
                  >
                    {formatProfile?.recommended_format ? 'Reconfigurar' : 'Configurar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Informações Gerais ── */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Informações Gerais
            </h2>
            <div className="space-y-3">

              {/* Instagram Handle */}
              <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><AtSign className="w-5 h-5 text-primary" /></div>
                {isEditingHandle ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Input value={handleValue} onChange={(e) => setHandleValue(e.target.value)} className="text-sm" placeholder="@seuarroba" autoFocus />
                    <Button size="icon" variant="ghost" onClick={handleSaveHandle} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}</Button>
                    <Button size="icon" variant="ghost" onClick={() => { setHandleValue(currentHandle); setIsEditingHandle(false); }} disabled={isSaving}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">@ do Instagram</p>
                      <p className="text-sm font-medium text-foreground truncate">{currentHandle || 'Adicione seu @'}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingHandle(true)} className="text-muted-foreground hover:text-foreground shrink-0"><Pencil className="w-4 h-4" /></Button>
                  </>
                )}
              </div>

              {/* Email */}
              <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground truncate">{profile?.email || user.email}</p>
                  <button
                    onClick={() => window.open('https://wa.me/5511999999999?text=Olá! Gostaria de alterar meu e-mail na Magnetic.IA', '_blank')}
                    className="text-xs text-primary hover:underline mt-1 block"
                  >
                    Alterar e-mail →
                  </button>
                </div>
              </div>

              {/* Plan Info */}
              {planInfo && (
                <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${planInfo.color}20` }}>
                    <Crown className="w-5 h-5" style={{ color: planInfo.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Seu Plano</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-semibold" style={{ backgroundColor: `${planInfo.color}20`, color: planInfo.color }}>
                        {planInfo.name}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate('/profile/credits')} className="text-xs text-primary shrink-0">
                    Ver planos <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}

              {/* Credits */}
              <button onClick={() => navigate('/profile/credits')} className="w-full bg-gradient-to-br from-muted/40 to-muted/20 border border-border/30 rounded-2xl p-4 flex items-center gap-3 text-left hover:border-primary/40 transition-all">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center"><Coins className="w-5 h-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="text-sm font-medium text-foreground">Ver meus créditos e consumo</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Sign out */}
              <Button onClick={handleSignOut} variant="outline" className="w-full h-12 gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-2xl">
                <LogOut className="w-5 h-5" />Sair da conta
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">CM Chat v1.0.0</p>
        </div>
      </div>
    </AppLayout>
  );
}
