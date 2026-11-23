import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiBaseURL } from "../../services/apiClient";
import { messageKeys } from "./messagesQueries";
export function useMessagingEvents(enabled:boolean) { const qc=useQueryClient(); useEffect(()=>{ if(!enabled)return; const source=new EventSource(`${apiBaseURL}/messages/events`,{withCredentials:true}); const refresh=()=>{void qc.invalidateQueries({queryKey:messageKeys.root});void qc.invalidateQueries({queryKey:["notifications"]});}; ["message.created","message.updated","message.reactions","message.deleted","message.hidden","conversation.read","conversation.created","presence.changed"].forEach(event=>source.addEventListener(event,refresh)); return()=>source.close(); },[enabled,qc]); }
