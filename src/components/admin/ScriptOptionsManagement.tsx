import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Save, X, Palette, Type, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ScriptOption {
  id: string;
  value: string;
  label: string;
  color?: string;
  display_order: number;
  is_active: boolean;
}

type OptionType = 'styles' | 'formats' | 'objectives';

export function ScriptOptionsManagement() {
  const { toast } = useToast();
  const [styles, setStyles] = useState<ScriptOption[]>([]);
  const [formats, setFormats] = useState<ScriptOption[]>([]);
  const [objectives, setObjectives] = useState<ScriptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ScriptOption | null>(null);
  const [deleteOption, setDeleteOption] = useState<{ option: ScriptOption; type: OptionType } | null>(null);
  const [currentType, setCurrentType] = useState<OptionType>('styles');
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    color: '#3B82F6',
    is_active: true,
  });

  useEffect(() => {
    fetchAllOptions();
  }, []);

  const fetchAllOptions = async () => {
    setLoading(true);
    try {
      const [stylesRes, formatsRes, objectivesRes] = await Promise.all([
        supabase.from('script_styles').select('*').order('display_order'),
        supabase.from('script_formats').select('*').order('display_order'),
        supabase.from('script_objectives').select('*').order('display_order'),
      ]);

      if (stylesRes.error) throw stylesRes.error;
      if (formatsRes.error) throw formatsRes.error;
      if (objectivesRes.error) throw objectivesRes.error;

      setStyles(stylesRes.data || []);
      setFormats(formatsRes.data || []);
      setObjectives(objectivesRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      toast({ title: 'Erro ao carregar opções', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getTableName = (type: OptionType) => {
    switch (type) {
      case 'styles': return 'script_styles';
      case 'formats': return 'script_formats';
      case 'objectives': return 'script_objectives';
    }
  };

  const getOptions = (type: OptionType) => {
    switch (type) {
      case 'styles': return styles;
      case 'formats': return formats;
      case 'objectives': return objectives;
    }
  };

  const setOptions = (type: OptionType, data: ScriptOption[]) => {
    switch (type) {
      case 'styles': setStyles(data); break;
      case 'formats': setFormats(data); break;
      case 'objectives': setObjectives(data); break;
    }
  };

  const handleOpenForm = (type: OptionType, option?: ScriptOption) => {
    setCurrentType(type);
    if (option) {
      setEditingOption(option);
      setFormData({
        value: option.value,
        label: option.label,
        color: option.color || '#3B82F6',
        is_active: option.is_active,
      });
    } else {
      setEditingOption(null);
      setFormData({ value: '', label: '', color: '#3B82F6', is_active: true });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingOption(null);
    setFormData({ value: '', label: '', color: '#3B82F6', is_active: true });
  };

  const handleSave = async () => {
    if (!formData.value || !formData.label) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const tableName = getTableName(currentType);
    const currentOptions = getOptions(currentType);

    try {
      const dataToSave: any = {
        value: formData.value,
        label: formData.label,
        is_active: formData.is_active,
      };
      
      if (currentType === 'objectives') {
        dataToSave.color = formData.color;
      }

      if (editingOption) {
        const { error } = await supabase
          .from(tableName)
          .update(dataToSave)
          .eq('id', editingOption.id);

        if (error) throw error;

        setOptions(currentType, currentOptions.map(o =>
          o.id === editingOption.id ? { ...o, ...dataToSave } : o
        ));
        toast({ title: 'Opção atualizada com sucesso!' });
      } else {
        const { data, error } = await supabase
          .from(tableName)
          .insert([{ ...dataToSave, display_order: currentOptions.length }])
          .select()
          .single();

        if (error) throw error;
        setOptions(currentType, [...currentOptions, data]);
        toast({ title: 'Opção criada com sucesso!' });
      }

      handleCloseForm();
    } catch (error: any) {
      console.error('Error saving option:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message?.includes('duplicate') ? 'Já existe uma opção com esse valor.' : 'Não foi possível salvar.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteOption) return;

    const tableName = getTableName(deleteOption.type);
    const currentOptions = getOptions(deleteOption.type);

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', deleteOption.option.id);

      if (error) throw error;

      setOptions(deleteOption.type, currentOptions.filter(o => o.id !== deleteOption.option.id));
      toast({ title: 'Opção excluída com sucesso!' });
    } catch (error) {
      console.error('Error deleting option:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } finally {
      setDeleteOption(null);
    }
  };

  const renderOptionsList = (type: OptionType, title: string, icon: React.ReactNode) => {
    const options = getOptions(type);
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {icon}
              {title}
            </CardTitle>
            <Button size="sm" onClick={() => handleOpenForm(type)} className="gap-1">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma opção cadastrada
            </p>
          ) : (
            <div className="space-y-2">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {type === 'objectives' && option.color && (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.value}</p>
                    </div>
                    <Badge variant={option.is_active ? 'default' : 'secondary'} className="text-xs">
                      {option.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenForm(type, option)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteOption({ option, type })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Opções de Roteiros</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os estilos, formatos e objetivos disponíveis para os roteiros.
        </p>
      </div>

      <Tabs defaultValue="styles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="styles" className="gap-2">
            <Type className="w-4 h-4" />
            Estilos
          </TabsTrigger>
          <TabsTrigger value="formats" className="gap-2">
            <Palette className="w-4 h-4" />
            Formatos
          </TabsTrigger>
          <TabsTrigger value="objectives" className="gap-2">
            <Target className="w-4 h-4" />
            Objetivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className="mt-4">
          {renderOptionsList('styles', 'Estilos de Roteiro', <Type className="w-4 h-4" />)}
        </TabsContent>

        <TabsContent value="formats" className="mt-4">
          {renderOptionsList('formats', 'Formatos de Vídeo', <Palette className="w-4 h-4" />)}
        </TabsContent>

        <TabsContent value="objectives" className="mt-4">
          {renderOptionsList('objectives', 'Objetivos', <Target className="w-4 h-4" />)}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Editar Opção' : 'Nova Opção'}
            </DialogTitle>
            <DialogDescription>
              {currentType === 'styles' && 'Configure um estilo de roteiro.'}
              {currentType === 'formats' && 'Configure um formato de vídeo.'}
              {currentType === 'objectives' && 'Configure um objetivo de conteúdo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (identificador) *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                placeholder="ex: storytelling_looping"
              />
              <p className="text-xs text-muted-foreground">
                Usado internamente. Use snake_case sem espaços.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Nome (exibição) *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="ex: Storytelling Looping"
              />
            </div>

            {currentType === 'objectives' && (
              <div className="space-y-2">
                <Label htmlFor="color">Cor</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Opção ativa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOption} onOpenChange={() => setDeleteOption(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir opção?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteOption?.option.label}"? 
              Isso pode afetar templates e roteiros existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
