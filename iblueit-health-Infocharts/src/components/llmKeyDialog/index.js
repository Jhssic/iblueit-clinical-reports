import React, { useEffect, useState } from "react";
import moment from "moment";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import { useMyContext } from "../../providers/MyContext";
import { extractMessage } from "../notification";
import { fetchLlmKeyStatus, saveLlmKey, deleteLlmKey } from "../../services/api/llmApiKey";

const GROQ_KEYS_URL = "https://console.groq.com/keys";

// Diálogo "Chave de IA": cada fisioterapeuta pode configurar a própria chave
// do Groq, usada na geração dos relatórios clínicos dele. Sem chave, o
// sistema usa a configuração padrão do servidor.
const LlmKeyDialog = ({ open, onClose }) => {
  const context = useMyContext();
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setApiKey("");
    setShowKey(false);
    setLoadingStatus(true);
    fetchLlmKeyStatus()
      .then((data) => { if (active) setStatus(data); })
      .catch((error) => { if (active) context.addNotification("error", extractMessage(error, "")); })
      .finally(() => { if (active) setLoadingStatus(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runAction = async (action) => {
    setSaving(true);
    try {
      const result = await action();
      setStatus(result.data);
      setApiKey("");
      context.addNotification("success", result.message);
    } catch (error) {
      context.addNotification("error", extractMessage(error, ""));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (event) => {
    event.preventDefault();
    // runAction já trata o erro internamente (notificação), então a promise
    // pode ser ignorada explicitamente.
    void runAction(() => saveLlmKey(apiKey.trim()));
  };

  const handleRemove = () => {
    void runAction(deleteLlmKey);
  };

  const renderStatus = () => {
    if (loadingStatus || !status) {
      return <CircularProgress size={24} aria-label="carregando status da chave" />;
    }
    if (status.configured) {
      return (
        <Alert severity="success">
          Chave própria configurada (••••{status.last4})
          {status.updatedAt && ` — atualizada em ${moment(status.updatedAt).format("DD/MM/YYYY")}`}.
          Seus relatórios usam esta chave.
        </Alert>
      );
    }
    return (
      <Alert severity="info">
        Nenhuma chave própria configurada. Seus relatórios usam a configuração padrão do servidor.
      </Alert>
    );
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="llm-key-dialog-title">
      <form onSubmit={handleSave}>
        <DialogTitle id="llm-key-dialog-title">Chave de IA</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Informe sua chave de API do Groq para que os relatórios clínicos gerados por você usem a sua cota.
            A chave fica guardada criptografada e nunca é exibida de novo. Você pode criar uma chave gratuita em{" "}
            <Link href={GROQ_KEYS_URL} target="_blank" rel="noopener noreferrer">console.groq.com/keys</Link>.
          </DialogContentText>

          {renderStatus()}

          <TextField
            sx={{ mt: 2 }}
            fullWidth
            autoComplete="off"
            label={status?.configured ? "Nova chave (substitui a atual)" : "Chave de API"}
            placeholder="gsk_..."
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            disabled={saving}
            inputProps={{ "aria-label": "chave de API de IA" }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showKey ? "ocultar chave" : "mostrar chave"}
                    onClick={() => setShowKey((value) => !value)}
                    edge="end"
                  >
                    {showKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {status?.configured && (
            <Button color="error" onClick={handleRemove} disabled={saving} sx={{ mr: "auto" }}>
              Remover chave
            </Button>
          )}
          <Button onClick={onClose} disabled={saving}>Fechar</Button>
          <Button type="submit" variant="contained" disabled={saving || !apiKey.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default LlmKeyDialog;
