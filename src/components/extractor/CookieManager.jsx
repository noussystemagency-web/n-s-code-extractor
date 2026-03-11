import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CookieManager({ cookies, setCookies }) {
  const handleCookiesChange = (e) => {
    setCookies(e.target.value);
  };

  const handleClear = () => {
    setCookies('');
    toast.success('Cookies eliminadas');
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cookie className="w-4 h-4 text-amber-600" />
          Cookies de Sesión
        </CardTitle>
        <CardDescription className="text-xs">
          Formato: nombre=valor; nombre2=valor2
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={cookies}
          onChange={handleCookiesChange}
          placeholder="sessionId=abc123; token=xyz789"
          className="text-xs font-mono h-20 resize-none bg-white border-amber-200"
        />
        {cookies && (
          <Button
            onClick={handleClear}
            variant="outline"
            size="sm"
            className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Limpiar Cookies
          </Button>
        )}
      </CardContent>
    </Card>
  );
}