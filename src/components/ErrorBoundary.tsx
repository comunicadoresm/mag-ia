import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 p-8">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Algo deu errado</h2>
          </div>
          <p className="text-muted-foreground text-center max-w-md">
            Ocorreu um erro inesperado. Tente novamente ou recarregue a pagina.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Recarregar pagina
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
