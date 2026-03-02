import React, { useState } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

interface PublicLeadFormProps {
  agentName: string;
  agentEmoji?: string | null;
  agentDescription?: string | null;
  onSubmit: (data: { name: string; email: string; phone: string }) => Promise<void>;
  loading?: boolean;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function PublicLeadForm({ agentName, agentEmoji, agentDescription, onSubmit, loading }: PublicLeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) e.phone = 'Telefone inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), email: email.trim(), phone: phone.replace(/\D/g, '') });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <Logo size="lg" className="justify-center" />
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-3xl">
            {agentEmoji || '🤖'}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{agentName}</h1>
          {agentDescription && (
            <p className="text-sm text-muted-foreground">{agentDescription}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/85 hover:scale-[1.03] hover:shadow-[0_0_20px_hsl(61_97%_67%/0.3)] active:scale-[0.98] transition-all duration-200">
            <MessageSquare className="w-4 h-4" />
            {loading ? 'Entrando...' : 'Começar conversa'}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Ao continuar, você concorda em receber comunicações sobre nossos conteúdos.
        </p>
      </div>
    </div>
  );
}
