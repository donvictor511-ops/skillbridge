import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { isAxiosError } from "axios";
import { Link, useSearchParams } from "react-router";
import { Archive, ChevronLeft, Copy, MessageCircle, MoreVertical, Send, Trash2, Phone, Video, ImagePlus, X, Maximize2, Reply, SmilePlus } from "lucide-react";

import { profilePath } from "../../app/paths";
import { Avatar, Button, Card, ErrorMessage } from "../../components/ui";
import { useCurrentUser } from "../auth/authQueries";
import { useConversation, useConversations, useMessageHistory, useMessagingActions } from "./messagesQueries";
import type { ConversationSummary, MessageItem } from "./messages.types";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { startCall } from "../calls/callsService";
import { paths } from "../../app/paths";
import { useNavigate } from "react-router";
import { uploadPostMedia } from "../posts/postsService";
import { VoiceDictationButton } from "../../components/ui/VoiceDictationButton";
import { VoiceRecordingButton } from "../../components/ui/VoiceRecordingButton";
import { uploadVoiceMessage } from "./messagesService";
import { MessageMediaViewer } from "./MessageMediaViewer";

function stamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function requestError(error: unknown): string {
  if (isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? "Please check your connection and try again.";
  }
  return error instanceof Error ? error.message : "Please try again.";
}

export function MessagesPage(): ReactElement {
  useDocumentTitle("Messages | SkillBridge");
  const [params, setParams] = useSearchParams();
  const requestedUser = params.get("userId");
  const shareProfile = params.get("shareProfile") === "1";
  const selectedId = params.get("conversationId") ?? "";
  const [archived, setArchived] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageItem | null>(null);
  const [reactionPickerId, setReactionPickerId] = useState<string | null>(null);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const historyPaneRef = useRef<HTMLDivElement>(null);

  const { data: user } = useCurrentUser();
  const list = useConversations(archived);
  const detail = useConversation(selectedId);
  const history = useMessageHistory(selectedId);
  const actions = useMessagingActions();
  const conversations = useMemo(() => list.data?.pages.flatMap((page) => page.data) ?? [], [list.data]);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    if (requestedUser && user?.id !== requestedUser && !actions.start.isPending) {
      actions.start.mutate(requestedUser, {
        onSuccess: (created) => {
          if (shareProfile && requestedUser) setDraft(`${window.location.origin}${profilePath(requestedUser)}`);
          setParams({ conversationId: created.id });
        },
      });
    }
  }, [requestedUser, shareProfile, user?.id]);

  // The API pages newest-to-oldest. Reverse page order, but preserve each
  // page's chronological order, so new messages stay at the bottom.
  const messages = useMemo(
    () => history.data?.pages.slice().reverse().flatMap((page) => page.data) ?? [],
    [history.data],
  );
  const latestMessageId = messages.at(-1)?.id;

  useEffect(() => {
    if (selectedId) actions.read.mutate(selectedId);
  }, [selectedId, latestMessageId]);

  useEffect(() => {
    if (!activeMenuId) return;
    function dismissMenu(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setActiveMenuId(null);
        return;
      }
      if (event instanceof PointerEvent && event.target instanceof Element && !event.target.closest("[data-message-menu]")) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissMenu);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissMenu);
    };
  }, [activeMenuId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedId, latestMessageId]);

  const conversation = detail.data ?? conversations.find((item) => item.id === selectedId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!selectedId || (!content && !attachment && !voiceNote) || actions.send.isPending) return;

    setMessageError(null);
    try {
      const media = attachment ? await uploadPostMedia(attachment) : voiceNote ? await uploadVoiceMessage(voiceNote) : null;
      await actions.send.mutateAsync({ id: selectedId, content, ...(media ? { mediaUrl: media.mediaUrl, mediaType: media.mediaType } : {}), ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}) });
      setDraft("");
      setAttachment(null);
      setVoiceNote(null);
      setReplyTarget(null);
    } catch (error) {
      setMessageError(`Your message could not be confirmed. ${requestError(error)}`);
      // A network interruption can happen after the server has saved the
      // message. Refresh the history before asking the user to retry.
      void history.refetch();
    }
  }

  async function saveEdit(messageId: string) {
    if (!editDraft.trim() || !selectedId) return;
    try { await actions.update.mutateAsync({ conversationId: selectedId, messageId, content: editDraft.trim() }); setEditingId(null); setEditDraft(""); }
    catch (problem) { setMessageError(requestError(problem)); }
  }

  function open(item: ConversationSummary) {
    setMessageError(null);
    setParams({ conversationId: item.id });
  }

  async function loadOlderMessages() {
    const pane = historyPaneRef.current;
    const oldHeight = pane?.scrollHeight ?? 0;
    await history.fetchNextPage();
    if (pane) {
      requestAnimationFrame(() => {
        pane.scrollTop += pane.scrollHeight - oldHeight;
      });
    }
  }

  async function copyMessage(message: MessageItem) {
    setActiveMenuId(null);
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyNotice("Message copied.");
      window.setTimeout(() => setCopyNotice(null), 2200);
    } catch {
      setMessageError("Could not copy this message. Check your browser permissions.");
    }
  }

  async function call(mode: "audio" | "video") {
    if (!selectedId || startingCall) return;
    setStartingCall(true); setMessageError(null);
    try { const room = await startCall({ kind: "direct", mode, conversationId: selectedId }); navigate(`${paths.calls}/${room.id}`); }
    catch (problem) { setMessageError(`Could not start the ${mode} call. ${requestError(problem)}`); }
    finally { setStartingCall(false); }
  }

  async function removeMessage(message: MessageItem, scope: "me" | "everyone") {
    setActiveMenuId(null);
    if (scope === "everyone" && !window.confirm("Delete this message for everyone?")) return;
    setMessageError(null);
    try {
      await actions.remove.mutateAsync({ conversationId: selectedId, messageId: message.id, scope });
    } catch (error) {
      setMessageError(`Could not delete the message. ${requestError(error)}`);
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-page">
      <div className="h-full min-h-0 px-0 py-0 sm:px-6 sm:py-3">
        <div className="mx-auto flex h-full min-h-0 max-w-[1440px] flex-col">
          <h1 className={`${selectedId ? "hidden md:block" : ""} mb-3 shrink-0 px-4 pt-3 text-2xl font-bold text-navy sm:px-0 sm:pt-0`}>Messages</h1>
          {actions.start.isError ? <div className="mb-2 shrink-0"><ErrorMessage message="Could not open this conversation. The profile may not be available for messaging." /></div> : null}
          <Card padding="none" className="grid min-h-0 flex-1 overflow-hidden rounded-none border-x-0 sm:rounded-2xl sm:border-x md:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className={`${selectedId ? "hidden md:flex" : "flex"} min-h-0 flex-col border-b border-line md:border-b-0 md:border-r`}>
            <div className="flex shrink-0 items-center justify-between border-b border-line p-3">
              <div className="flex gap-2">
                <button type="button" className={`rounded-control px-3 py-2 text-sm ${!archived ? "bg-brand/10 text-brand" : "text-muted"}`} onClick={() => setArchived(false)}>Inbox</button>
                <button type="button" className={`rounded-control px-3 py-2 text-sm ${archived ? "bg-brand/10 text-brand" : "text-muted"}`} onClick={() => setArchived(true)}>Archived</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {list.isPending ? (
                <div className="p-6 text-center text-muted">Loading conversations…</div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted">No conversations yet. Visit a profile and choose Message to start one.</div>
              ) : conversations.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 border-b border-line p-4 hover:bg-page ${selectedId === item.id ? "bg-brand/5" : ""}`}>
                  <Link to={profilePath(item.otherUser.userId)} aria-label={`View ${item.otherUser.displayName}'s profile`} className="shrink-0 rounded-full">
                    <Avatar name={item.otherUser.displayName} src={item.otherUser.avatarUrl} />
                  </Link>
                  <button type="button" onClick={() => open(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold text-navy">
                        {item.otherUser.displayName}
                        <span role="status" aria-label={item.otherUser.isOnline ? "Online" : "Offline"} title={item.otherUser.isOnline ? "Online" : "Offline"} className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.otherUser.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                      </span>
                      <span className="block truncate text-sm text-muted">{item.lastMessage?.content ?? "Start a conversation"}</span>
                    </span>
                    {item.unreadCount > 0 ? <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-white">{item.unreadCount}</span> : null}
                  </button>
                </div>
              ))}
            </div>
            {list.hasNextPage ? <button type="button" className="w-full shrink-0 p-3 text-sm text-brand" onClick={() => void list.fetchNextPage()}>Load more</button> : null}
          </aside>

          <section className={`${selectedId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
            {!selectedId || !conversation ? (
              <div className="m-auto p-8 text-center text-muted"><MessageCircle className="mx-auto mb-3 h-10 w-10" /><p>Select a conversation to read messages.</p></div>
            ) : (
              <>
                <header className="flex shrink-0 items-center gap-3 border-b border-line p-3 sm:p-4">
                  <button type="button" onClick={() => setParams({})} aria-label="Back to conversations" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-page hover:text-navy md:hidden">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Link to={profilePath(conversation.otherUser.userId)} aria-label={`View ${conversation.otherUser.displayName}'s profile`}>
                    <Avatar name={conversation.otherUser.displayName} src={conversation.otherUser.avatarUrl} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-navy">{conversation.otherUser.displayName}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${conversation.otherUser.isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
                      {conversation.otherUser.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                  <button type="button" onClick={() => void call("audio")} disabled={startingCall} aria-label="Start voice call" title="Voice call" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-page hover:text-brand disabled:opacity-50"><Phone className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void call("video")} disabled={startingCall} aria-label="Start video call" title="Video call" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-page hover:text-brand disabled:opacity-50"><Video className="h-4 w-4" /></button>
                  <Button size="sm" variant="secondary" onClick={() => archived ? actions.restore.mutate(selectedId) : actions.archive.mutate(selectedId)}>
                    <Archive className="mr-1 h-4 w-4" />{archived ? "Restore" : "Archive"}
                  </Button>
                </header>

                <div ref={historyPaneRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
                  {history.hasNextPage ? <button type="button" className="mx-auto block text-sm text-brand" onClick={() => void loadOlderMessages()}>Load older messages</button> : null}
                  {history.isPending ? <div className="text-center text-muted">Loading messages…</div> : null}
                  {history.isError ? <ErrorMessage message="Could not load messages. Please try again." onRetry={() => void history.refetch()} /> : null}
                  {messages.map((message) => {
                    const isMine = message.senderId === user?.id;
                    const menuOpen = activeMenuId === message.id;
                    return (
                      <div id={`message-${message.id}`} key={message.id} className={`group flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className="relative max-w-[85%]">
                          <div className={`rounded-card px-4 py-2 ${isMine ? "bg-brand text-white" : "bg-page text-ink"}`}>
                            {editingId === message.id ? <div className="min-w-52"><textarea aria-label="Edit message" value={editDraft} onChange={(event) => setEditDraft(event.target.value)} maxLength={5000} rows={3} className="w-full rounded-lg border border-line bg-surface p-2 text-sm text-ink" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="text-xs underline">Cancel</button><button type="button" onClick={() => void saveEdit(message.id)} disabled={actions.update.isPending} className="text-xs font-semibold underline">Save</button></div></div> : null}
                            {editingId !== message.id && message.content ? <p className={`whitespace-pre-wrap break-words ${message.isDeleted ? "italic opacity-75" : ""}`}>{message.content}</p> : null}
                            {message.replyTo ? <button type="button" onClick={() => document.getElementById(`message-${message.replyTo?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mb-2 block w-full rounded-lg border-l-2 border-current/50 bg-black/5 px-2 py-1 text-left text-xs"><span className="block font-semibold">Replying to {message.replyTo.senderName}</span><span className="block truncate opacity-80">{message.replyTo.content || (message.replyTo.mediaType === "video" ? "Sent a video" : message.replyTo.mediaType === "image" ? "Sent a photo" : "Message")}</span></button> : null}
                            {message.mediaUrl && (message.mediaType === "image" || message.mediaType === "video") ? <><p className="mt-2 text-[11px] font-semibold opacity-80">{message.mediaType === "image" ? "Sent a photo" : "Sent a video"}</p><div className="relative mt-1">{message.mediaType === "image" ? <button type="button" onClick={() => setExpandedMedia({ url: message.mediaUrl!, type: "image" })} aria-label="Expand photo" className="block cursor-zoom-in"><img src={message.mediaUrl} alt="Photo attachment; select to expand" className="max-h-80 max-w-full rounded-lg object-contain" /></button> : <><video src={message.mediaUrl} controls playsInline className="max-h-80 max-w-full rounded-lg" /><button type="button" onClick={() => setExpandedMedia({ url: message.mediaUrl!, type: "video" })} aria-label="Expand video" title="Expand video" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-black/60 text-white hover:bg-black/80"><Maximize2 className="h-4 w-4" /></button></>}</div></> : null}
                            {message.mediaUrl && message.mediaType === "audio" ? <audio controls preload="metadata" src={message.mediaUrl} className="mt-2 max-w-full" aria-label="Voice message" /> : null}
                            {message.reactions?.length || reactionPickerId === message.id ? <div className="mt-2 flex flex-wrap items-center gap-1">{message.reactions?.map((reaction) => <button key={reaction.emoji} type="button" onClick={() => actions.react.mutate({ conversationId: selectedId, messageId: message.id, emoji: reaction.emoji })} aria-label={`${reaction.emoji}, ${reaction.count} reactions`} className={`rounded-full border px-2 py-0.5 text-xs ${reaction.reactedByMe ? "border-brand bg-brand/10" : "border-line bg-surface/70"}`}>{reaction.emoji} {reaction.count}</button>)}{reactionPickerId === message.id ? ["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => <button key={emoji} type="button" onClick={() => { actions.react.mutate({ conversationId: selectedId, messageId: message.id, emoji }); setReactionPickerId(null); }} aria-label={`React ${emoji}`} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/10">{emoji}</button>) : null}</div> : null}
                            <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-75">
                              <time dateTime={message.createdAt}>{stamp(message.createdAt)}</time>
                              {message.editedAt ? <span>Edited</span> : null}
                              {isMine && message.readByRecipient ? <span>Seen</span> : null}
                            </div>
                          </div>
                          {!message.isDeleted ? (
                            <div data-message-menu className={`absolute top-1/2 z-20 -translate-y-1/2 ${isMine ? "right-full mr-1" : "left-full ml-1"}`}>
                              <button type="button" onClick={() => setActiveMenuId(menuOpen ? null : message.id)} aria-label="Message options" aria-haspopup="menu" aria-expanded={menuOpen} className="rounded-full p-1.5 text-muted opacity-70 hover:bg-surface hover:text-navy focus:opacity-100 group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {menuOpen ? (
                                <div role="menu" aria-label="Message options" className={`absolute top-0 z-30 min-w-48 rounded-xl border border-line bg-surface p-1.5 text-ink shadow-card ${isMine ? "right-full mr-1" : "left-full ml-1"}`}>
                                  <button type="button" role="menuitem" onClick={() => void copyMessage(message)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-page"><Copy className="h-4 w-4" />Copy</button>
                                  <button type="button" role="menuitem" onClick={() => { setActiveMenuId(null); setReplyTarget(message); setReactionPickerId(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-page"><Reply className="h-4 w-4" />Reply</button>
                                  <button type="button" role="menuitem" onClick={() => { setActiveMenuId(null); setReactionPickerId(reactionPickerId === message.id ? null : message.id); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-page"><SmilePlus className="h-4 w-4" />React</button>
                                  {isMine && now - new Date(message.createdAt).getTime() <= 15 * 60_000 ? <button type="button" role="menuitem" onClick={() => { setActiveMenuId(null); setEditingId(message.id); setEditDraft(message.content); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-page">Edit message</button> : null}
                                  <button type="button" role="menuitem" onClick={() => void removeMessage(message, "me")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-page"><Trash2 className="h-4 w-4" />Delete for me</button>
                                  {isMine ? <button type="button" role="menuitem" onClick={() => void removeMessage(message, "everyone")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-strong hover:bg-danger/10"><Trash2 className="h-4 w-4" />Delete for everyone</button> : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {copyNotice ? <p role="status" className="shrink-0 px-4 py-1 text-right text-xs text-success-strong">{copyNotice}</p> : null}
                {messageError ? <p role="alert" className="shrink-0 px-4 py-2 text-sm text-danger-strong">{messageError}</p> : null}
                {replyTarget ? <div className="flex shrink-0 items-center gap-2 border-t border-line bg-page px-4 py-2"><Reply className="h-4 w-4 text-brand" /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-navy">Replying to {replyTarget.sender.displayName}</p><p className="truncate text-xs text-muted">{replyTarget.content || (replyTarget.mediaType === "video" ? "Sent a video" : replyTarget.mediaType === "image" ? "Sent a photo" : "Voice message")}</p></div><button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply" className="rounded p-1 text-muted hover:bg-surface"><X className="h-4 w-4" /></button></div> : null}
                <form onSubmit={submit} className="shrink-0 border-t border-line bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                  <div className="flex items-end gap-2">
                    <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-page text-muted transition-colors hover:text-brand" title="Attach an image or video" aria-label="Attach an image or video"><ImagePlus className="h-5 w-5" /><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" onChange={(event) => { setAttachment(event.target.files?.[0] ?? null); setVoiceNote(null); }} /></label>
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={3} placeholder={replyTarget ? `Reply to ${replyTarget.sender.displayName}…` : attachment?.name ?? voiceNote?.name ?? "Write a message…"} className="min-h-[5.5rem] max-h-36 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-page px-4 py-3 text-base leading-relaxed text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" />
                    {voiceNote ? <button type="button" onClick={() => setVoiceNote(null)} aria-label="Remove voice recording" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-danger hover:bg-danger/10"><X className="h-5 w-5" /></button> : null}
                    <Button type="submit" aria-label={actions.send.isPending ? "Sending message" : "Send message"} disabled={(!draft.trim() && !attachment && !voiceNote) || actions.send.isPending} className="h-11 w-11 shrink-0 justify-center rounded-full px-0 sm:w-auto sm:rounded-xl sm:px-4">
                      <Send className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" /><span className="hidden sm:inline">{actions.send.isPending ? "Sending…" : "Send"}</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="Voice message options">
                    <VoiceDictationButton onText={(text) => setDraft((value) => `${value}${value ? " " : ""}${text}`)} disabled={actions.send.isPending} />
                    <VoiceRecordingButton disabled={actions.send.isPending} onRecorded={(file) => { setVoiceNote(file); setAttachment(null); }} />
                    <span className="ml-auto hidden text-xs text-muted sm:block">Enter to send · add an attachment or voice note</span>
                  </div>
                </form>
              </>
            )}
          </section>
        </Card>
        </div>
      </div>
      <MessageMediaViewer media={expandedMedia} onClose={() => setExpandedMedia(null)} />
    </div>
  );
}
