import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import TranslatorPage from "@/pages/translator";
import { StreamlinedTranslator } from "@/components/streamlined-translator";
import { EnhancedSpeechInterface } from "@/components/enhanced-speech-interface";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TranslatorPage} />
      <Route path="/streamlined" component={StreamlinedTranslator} />
      <Route path="/speech" component={EnhancedSpeechInterface} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
