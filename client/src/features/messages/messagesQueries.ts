import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import * as service from "./messagesService";
import type { MessageItem, Page } from "./messages.types";
export const messageKeys = { root:["messages"] as const, conversations:(archived=false)=>["messages","conversations",archived] as const, detail:(id:string)=>["messages","conversation",id] as const, history:(id:string)=>["messages","history",id] as const, calls:(id:string)=>["messages","call-history",id] as const, unread:["messages","unread"] as const };
export function useConversations(archived=false) { return useInfiniteQuery({ queryKey:messageKeys.conversations(archived), queryFn:({pageParam})=>service.listConversations(archived,pageParam), initialPageParam:undefined as string|undefined, getNextPageParam:p=>p.nextCursor??undefined }); }
export function useMessageHistory(id:string) { return useInfiniteQuery({ queryKey:messageKeys.history(id), queryFn:({pageParam})=>service.getMessages(id,pageParam), initialPageParam:undefined as string|undefined, getNextPageParam:p=>p.nextCursor??undefined, enabled:Boolean(id) }); }
export function useConversation(id:string) { return useQuery({ queryKey:messageKeys.detail(id),queryFn:()=>service.getConversation(id),enabled:Boolean(id) }); }
export function useConversationCalls(id:string) { return useQuery({ queryKey:messageKeys.calls(id),queryFn:()=>service.getConversationCalls(id),enabled:Boolean(id),refetchInterval:15000 }); }
export function useUnreadMessages() { return useQuery({queryKey:messageKeys.unread,queryFn:service.unreadMessages,refetchInterval:30000}); }
export function useMessagingActions() { const qc=useQueryClient(); const refresh=()=>{void qc.invalidateQueries({queryKey:messageKeys.root});void qc.invalidateQueries({queryKey:["notifications"]});}; return {
  start:useMutation({mutationFn:service.createConversation,onSuccess:(c)=>{qc.setQueryData(messageKeys.detail(c.id),c);refresh();}}),
  send:useMutation({
    mutationFn:({id,...input}:{id:string;content:string;mediaUrl?:string;mediaType?:"image"|"video"|"audio";replyToMessageId?:string})=>service.sendMessage(id,input),
    onSuccess:(message,variables)=>{
      qc.setQueryData<InfiniteData<Page<MessageItem>>>(messageKeys.history(variables.id),(current)=>{
        if(!current?.pages.length || current.pages.some((page)=>page.data.some((item)=>item.id===message.id))) return current;
        const [newest,...older]=current.pages;
        return {...current,pages:[{...newest,data:[...newest.data,message]},...older]};
      });
      refresh();
    },
    onError:async(_error,variables)=>{
      await Promise.all([
        qc.invalidateQueries({queryKey:messageKeys.history(variables.id)}),
        qc.invalidateQueries({queryKey:messageKeys.conversations()}),
        qc.invalidateQueries({queryKey:messageKeys.unread}),
      ]);
    },
  }),
  read:useMutation({mutationFn:service.markRead,onSuccess:refresh}),
  archive:useMutation({mutationFn:service.archive,onSuccess:refresh}),
  restore:useMutation({mutationFn:service.restore,onSuccess:refresh}),
  remove:useMutation({mutationFn:({conversationId,messageId,scope}:{conversationId:string;messageId:string;scope:"me"|"everyone"})=>service.deleteMessage(conversationId,messageId,scope),onSuccess:refresh}),
  update:useMutation({mutationFn:({conversationId,messageId,content}:{conversationId:string;messageId:string;content:string})=>service.updateMessage(conversationId,messageId,content),onSuccess:(_message,variables)=>{void qc.invalidateQueries({queryKey:messageKeys.history(variables.conversationId)});refresh();}}),
  react:useMutation({mutationFn:({conversationId,messageId,emoji}:{conversationId:string;messageId:string;emoji:string})=>service.reactToMessage(conversationId,messageId,emoji),onSuccess:(_reactions,variables)=>{void qc.invalidateQueries({queryKey:messageKeys.history(variables.conversationId)});}}),
}; }
