import { TODAY, centre, students, worksheets, uid } from './model.js';

const studentIndex = new Map(students.map(student => [student.id, student]));
const staffRoles = new Set(['admin', 'teacher']);
const preferenceNames = { archive: 'archived', favourite: 'favourite', unread: 'unread' };

export function viewerKey(viewer) {
  if (staffRoles.has(viewer?.role)) return viewer.role;
  if (viewer?.role === 'parent' && studentIndex.has(viewer.studentId)) return 'parent:' + viewer.studentId;
  return '';
}

export function canViewConversation(state, thread, viewer) {
  const actual = thread && state.messages.find(item => item.id === thread.id);
  if (!actual || !viewerKey(viewer)) return false;
  if (staffRoles.has(viewer.role)) return true;
  return actual.type !== 'group' && actual.audience !== 'staff' && actual.studentId === viewer.studentId;
}

function requireThread(state, threadId, viewer) {
  const thread = state.messages.find(item => item.id === threadId);
  if (!canViewConversation(state, thread, viewer)) throw new Error('This conversation is not available to this viewer.');
  return thread;
}

function preferences(state, threadId, viewer) {
  return { archived: false, favourite: false, unread: false, ...state.chatSettings?.preferences?.[viewerKey(viewer)]?.[threadId] };
}

function savePreferences(state, threadId, viewer, value) {
  state.chatSettings ??= {};
  state.chatSettings.preferences ??= {};
  const key = viewerKey(viewer);
  state.chatSettings.preferences[key] ??= {};
  state.chatSettings.preferences[key][threadId] = value;
  return value;
}

export function normalizeConversations(state) {
  state.chatSettings ??= {};
  state.chatSettings.preferences ??= {};
  if (!state.chatSettings.demoGroupSeeded) {
    if (!state.messages.some(thread => thread.id === 'thread-staff-team')) {
      state.messages.push({
        id: 'thread-staff-team', type: 'group', audience: 'staff', title: 'Tsuen Wan team', assignedTo: 'Reception', followUp: false,
        messages: [
          { author: 'centre', senderKey: 'admin', senderName: centre.manager, text: 'Please check today’s lesson changes before the afternoon classes.', time: '09:00', date: TODAY },
          { author: 'centre', senderKey: 'staff:ming', senderName: 'Ming', text: 'I have checked my timetable. The classroom is ready.', time: '09:04', date: TODAY },
          { author: 'centre', senderKey: 'staff:reception', senderName: 'Reception', text: 'Parent enquiries are in the shared inbox for follow-up.', time: '09:06', date: TODAY }
        ]
      });
    }
    state.chatSettings.demoGroupSeeded = true;
  }
  for (const thread of state.messages) {
    thread.type ??= 'direct';
    const student = studentIndex.get(thread.studentId);
    for (const [index, message] of thread.messages.entries()) {
      message.id ??= thread.id + '-message-' + index;
      message.date ??= /^Yesterday\b/i.test(message.time || '') ? '2026-09-29' : TODAY;
      message.readBy ??= [];
      message.reactions ??= [];
      message.senderKey ??= message.author === 'parent' ? 'parent:' + thread.studentId : 'centre';
      message.senderName ??= message.author === 'parent' ? student?.parent || 'Parent' : centre.manager;
    }
  }
  return state;
}

export function unreadCount(thread, viewer) {
  const key = viewerKey(viewer);
  if (!key || !thread || viewer.role === 'parent' && (thread.type === 'group' || thread.audience === 'staff' || thread.studentId !== viewer.studentId)) return 0;
  const count = thread.messages.filter(message => {
    const incoming = thread.type === 'group' ? message.senderKey !== key : viewer.role === 'parent' ? message.author === 'centre' : message.author === 'parent';
    return incoming && !(message.readBy || []).includes(key);
  }).length;
  return Math.max(count, thread.preferenceViewerKey === key && thread.markedUnread ? 1 : 0);
}

export function conversationThreads(state, { role, studentId, query = '', filter = 'all' }) {
  const viewer = { role, studentId }, key = viewerKey(viewer), tokens = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  return state.messages.filter(thread => canViewConversation(state, thread, viewer)).map(thread => {
    const pref = preferences(state, thread.id, viewer), student = studentIndex.get(thread.studentId);
    const view = { ...thread, title: thread.title || student?.name || 'Conversation', archived: pref.archived, favourite: pref.favourite, markedUnread: pref.unread, preferenceViewerKey: key, lastMessage: thread.messages.at(-1) };
    view.unreadCount = unreadCount(view, viewer);
    return view;
  }).filter(thread => {
    if (filter === 'archived' ? !thread.archived : thread.archived) return false;
    if (filter === 'followup' && (!staffRoles.has(role) || !thread.followUp)) return false;
    if (filter === 'unread' && !thread.unreadCount || filter === 'favourites' && !thread.favourite || filter === 'groups' && thread.type !== 'group') return false;
    const student = studentIndex.get(thread.studentId);
    const searchable = [thread.title, student?.name, student?.number, student?.parent, student?.phone, ...thread.messages.flatMap(message => [message.text, message.attachment?.name])].join(' ').toLowerCase();
    const compact = searchable.replace(/[\s-]/g, '');
    return tokens.every(token => searchable.includes(token) || compact.includes(token.replace(/-/g, '')));
  }).sort((a, b) => {
    const stamp = thread => (thread.lastMessage?.date || '') + (/^\d{2}:\d{2}$/.test(thread.lastMessage?.time || '') ? thread.lastMessage.time : '00:00');
    return stamp(b).localeCompare(stamp(a));
  });
}

export function markConversationRead(state, threadId, viewer) {
  const thread = requireThread(state, threadId, viewer), key = viewerKey(viewer);
  for (const message of thread.messages) {
    message.readBy ??= [];
    if (!message.readBy.includes(key)) message.readBy.push(key);
  }
  savePreferences(state, threadId, viewer, { ...preferences(state, threadId, viewer), unread: false });
  return thread;
}

function attachmentDetails(attachment) {
  if (attachment === undefined || attachment === null) return undefined;
  if (typeof attachment !== 'object' || Array.isArray(attachment) || !['image', 'document', 'worksheet'].includes(attachment.kind)) throw new Error('Choose a supported attachment.');
  if (typeof attachment.name !== 'string' || !attachment.name.trim() || attachment.name.length > 200) throw new Error('Enter a valid attachment name.');
  const result = { kind: attachment.kind, name: attachment.name.trim() };
  if (attachment.kind === 'worksheet') {
    if (!worksheets.some(worksheet => worksheet.id === attachment.worksheetId)) throw new Error('Choose a worksheet from the library.');
    result.worksheetId = attachment.worksheetId;
  }
  for (const field of ['url', 'dataUrl']) {
    if (attachment[field] === undefined) continue;
    const value = attachment[field];
    if (typeof value !== 'string' || /[\u0000-\u0020]/.test(value) || !(/^(https?:\/\/|blob:)/i.test(value) || /^\/(?!\/)/.test(value) || /^data:(?:image\/(?:png|jpeg|gif|webp)|application\/pdf|text\/plain);base64,[a-z\d+/=]*$/i.test(value))) throw new Error('Choose a valid attachment URL.');
    result[field] = value;
  }
  if (attachment.mimeType !== undefined) {
    if (typeof attachment.mimeType !== 'string' || attachment.mimeType.length > 100) throw new Error('Choose a valid attachment type.');
    result.mimeType = attachment.mimeType;
  }
  if (attachment.size !== undefined) {
    if (!Number.isSafeInteger(attachment.size) || attachment.size < 0) throw new Error('Choose a valid attachment size.');
    result.size = attachment.size;
  }
  return result;
}

export function sendConversationMessage(state, threadId, { viewer, text = '', replyToId, attachment }) {
  const thread = requireThread(state, threadId, viewer), key = viewerKey(viewer);
  if (typeof text !== 'string' || text.trim().length > 4000) throw new Error('Keep messages to 4,000 characters.');
  const content = text.trim(), attached = attachmentDetails(attachment);
  if (!content && !attached) throw new Error('Write a message or add an attachment.');
  if (replyToId !== undefined && !thread.messages.some(message => message.id === replyToId)) throw new Error('The message you are replying to is not in this conversation.');
  const message = {
    id: uid('message'), author: viewer.role === 'parent' ? 'parent' : 'centre', senderKey: key,
    senderName: viewer.role === 'parent' ? studentIndex.get(viewer.studentId).parent : viewer.role === 'teacher' ? 'Koko' : centre.manager,
    text: content, date: TODAY, time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Hong_Kong' }), readBy: [key], reactions: [],
    ...(replyToId !== undefined ? { replyToId } : {}), ...(attached ? { attachment: attached } : {})
  };
  thread.messages.push(message);
  savePreferences(state, threadId, viewer, { ...preferences(state, threadId, viewer), unread: false });
  return message;
}

export function toggleConversationPreference(state, threadId, viewer, preference) {
  const thread = requireThread(state, threadId, viewer), field = preferenceNames[preference];
  if (!field) throw new Error('Choose a valid conversation preference.');
  const pref = preferences(state, threadId, viewer);
  if (field === 'unread') {
    if (pref.unread || unreadCount(thread, viewer)) {
      markConversationRead(state, threadId, viewer);
      return preferences(state, threadId, viewer);
    }
    pref.unread = true;
  } else pref[field] = !pref[field];
  return savePreferences(state, threadId, viewer, pref);
}

export function toggleConversationReaction(state, threadId, messageId, viewer, emoji) {
  const thread = requireThread(state, threadId, viewer), message = thread.messages.find(item => item.id === messageId), key = viewerKey(viewer);
  if (!message) throw new Error('Choose a message in this conversation.');
  if (typeof emoji !== 'string' || !emoji.trim() || emoji.length > 20) throw new Error('Choose a valid reaction.');
  message.reactions ??= [];
  const reaction = message.reactions.find(item => item.emoji === emoji);
  if (!reaction) message.reactions.push({ emoji, by: [key] });
  else if (reaction.by.includes(key)) {
    reaction.by = reaction.by.filter(item => item !== key);
    if (!reaction.by.length) message.reactions = message.reactions.filter(item => item !== reaction);
  } else reaction.by.push(key);
  return message;
}
