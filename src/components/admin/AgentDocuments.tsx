import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  File
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface AgentDocument {
  id: string;
  agent_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
}

interface AgentDocumentsProps {
  agentId: string;
  agentName: string;
}

const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AgentDocuments({ agentId, agentName }: AgentDocumentsProps) {
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<AgentDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [agentId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_documents')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as AgentDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isValidType = Object.keys(ACCEPTED_TYPES).includes(file.type) ||
      file.name.endsWith('.md') || file.name.endsWith('.txt');
    
    if (!isValidType) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas arquivos PDF, TXT, MD e DOCX são aceitos.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${agentId}/${timestamp}_${sanitizedName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('agent_documents')
        .insert({
          agent_id: agentId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || 'text/plain',
          file_size: file.size,
          status: 'pending',
        })
        .select()
        .single();

      if (docError) throw docError;

      // Add to local state
      setDocuments(prev => [docData as AgentDocument, ...prev]);

      toast({
        title: 'Arquivo enviado',
        description: 'Processando documento...',
      });

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke('process-document', {
        body: { document_id: docData.id },
      });

      if (processError) {
        console.error('Processing error:', processError);
        toast({
          title: 'Erro no processamento',
          description: 'Tente novamente mais tarde.',
          variant: 'destructive',
        });
      } else {
        // Refresh documents to get updated status
        setTimeout(() => fetchDocuments(), 2000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível fazer upload do arquivo.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('agent-documents')
        .remove([deleteDoc.file_path]);

      // Delete record (will cascade delete chunks)
      const { error } = await supabase
        .from('agent_documents')
        .delete()
        .eq('id', deleteDoc.id);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== deleteDoc.id));

      toast({
        title: 'Documento excluído',
        description: 'O documento e seus dados foram removidos.',
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o documento.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDoc(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string, errorMessage?: string | null) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50">
            <CheckCircle className="w-3 h-3" />
            Pronto
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processando
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50" title={errorMessage || undefined}>
            <XCircle className="w-3 h-3" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-300 bg-yellow-50">
            <AlertCircle className="w-3 h-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (fileName.endsWith('.docx')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Base de Conhecimento</h3>
          <p className="text-xs text-muted-foreground">
            Arquivos usados como contexto para o agente
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Adicionar arquivo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum documento adicionado ainda.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione arquivos PDF, TXT, MD ou DOCX para criar uma base de conhecimento.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group"
            >
              {getFileIcon(doc.file_type, doc.file_name)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </p>
              </div>
              {getStatusBadge(doc.status, doc.error_message)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDoc(doc)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteDoc?.file_name}"? 
              Isso removerá o documento e todos os dados extraídos dele.
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
