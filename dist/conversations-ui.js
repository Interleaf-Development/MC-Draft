import { TODAY, centre, tutors, students, studentById, worksheets, uid } from './model.js';
import { conversationThreads, markConversationRead, sendConversationMessage, toggleConversationReaction, canViewConversation, viewerKey } from './conversations.js';
import { familyText, familyDate, familyContent } from './family-locale.js';
import { familyChatMessage } from './chat-seed-locale.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  new:'<path d="M20 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8m3-1h6m-3-3v6M7 10h5M7 15h9"/>',
  back:'<path d="m11 5-7 7 7 7M4 12h16"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  close:'<path d="m6 6 12 12M6 18 12-12"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14c2 4 6 4 8 0M8 9h.01M16 9h.01"/>',
  send:'<path d="m3 3 19 9-19 9 4-9-4-9ZM7 12h15"/>',
  archive:'<path d="M4 8v12h16V8M3 3h18v5H3ZM9 12h6"/>',
  check:'<path d="m4 12 4 4L19 5"/>',
  checks:'<path d="m2 12 4 4L17 5m-6 9 2 2L24 5"/>',
  file:'<path d="M14 2H5v20h14V7ZM14 2v6h5M8 13h8M8 17h5"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-7 5 7"/>',
  book:'<path d="M12 6v15M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v17h-5a4 4 0 0 0-4 1 4 4 0 0 0-4-1H3Z"/>',
  group:'<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m1-17a4 4 0 0 1 0 8m3 3a6 6 0 0 1 4 6"/>',
  flag:'<path d="M5 22V3c4-3 9 3 14 0v11c-5 3-10-3-14 0"/>',
  star:'<path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z"/>',
};
const icon = name => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.file)+'</svg>';
const button = (action, label, cls='', attrs='') => '<button type="button" class="'+cls+'" data-action="wa-'+action+'" '+attrs+'>'+label+'</button>';
const iconButton = (action, name, label, extra='', attrs='') => button(action,icon(name),'wa-icon-btn '+extra,'aria-label="'+esc(label)+'" title="'+esc(label)+'" '+attrs);
const messageText = message => message?.text || message?.attachment?.name || '';
const own = (thread,message,viewer) => thread.type==='group' ? message.senderKey===viewerKey(viewer) : message.author===(viewer.role==='parent'?'parent':'centre');
const EMOJIS = ['😀','😊','❤️','👍','🙏','🎉','👏','✅','📚','✏️','🙌','🙂'];

export function createConversationUI({getState,getViewer,persist,render:renderApp,modal,closeModal,toast,childSwitch}) {
  const views = new Map();
  let renderedKey='', renderedThread='', scrollTop=0, listTop=0, jumpBottom=true, focusAfter=null, pickerQuery='', pickerLimit=20;
  let navigationMotion=null;
  const t = (english, chinese) => getViewer().role==='parent' ? chinese : english;
  const textLabel = value => familyText(value,getViewer().role);
  const contentLabel = value => familyContent(value,getViewer().role);
  const displayText = (thread,message) => familyChatMessage(thread,message,getViewer().role);
  const attachmentName = attachment => {
    const worksheet=attachment?.kind==='worksheet'&&worksheets.find(w=>w.id===attachment.worksheetId);
    return worksheet&&attachment.name===worksheet.title ? contentLabel(worksheet.title) : attachment?.name||'';
  };
  const displayMessage = (thread,message) => displayText(thread,message)||attachmentName(message?.attachment);
  const messageSearchText = (thread,message) => [messageText(message),displayMessage(thread,message),message?.attachment?.name,attachmentName(message?.attachment)].join(' ').toLowerCase();
  const dayLabel = date => date===TODAY?t('Today','今天'):date==='2026-09-29'?t('Yesterday','昨天'):getViewer().role==='parent'?familyDate(date,'parent',true):date;
  const errorLabels = {
    'This conversation is not available to this viewer.':'你無法查看此對話。',
    'Choose a supported attachment.':'請選擇支援的附件格式。',
    'Enter a valid attachment name.':'請輸入有效的附件名稱。',
    'Choose a worksheet from the library.':'請從教材庫選擇工作紙。',
    'Choose a valid attachment URL.':'請選擇有效的附件連結。',
    'Choose a valid attachment type.':'請選擇有效的附件格式。',
    'Choose a valid attachment size.':'附件大小無效，請重新選擇。',
    'Keep messages to 4,000 characters.':'訊息不可超過 4,000 個字元。',
    'Write a message or add an attachment.':'請輸入訊息或加入附件。',
    'The message you are replying to is not in this conversation.':'你要回覆的訊息不在此對話中。',
    'Choose a message in this conversation.':'請選擇此對話中的訊息。',
    'Choose a valid reaction.':'請選擇有效的表情回應。'
  };
  const errorMessage = value => getViewer().role==='parent' ? errorLabels[value]||textLabel(value) : value;
  const current = () => {
    const key=viewerKey(getViewer());
    if(!views.has(key)) views.set(key,{selected:null,open:false,query:'',filter:'all',limit:30,messageLimit:50,searchOpen:false,chatQuery:'',menu:null,drafts:{},replies:{},attachments:{}});
    return views.get(key);
  };
  const threadById = id => getState().messages.find(t=>t.id===id && canViewConversation(getState(),t,getViewer()));
  const selected = () => threadById(current().selected);
  const title = thread => thread.type==='group' ? thread.title : getViewer().role==='parent' ? textLabel(centre.name) : studentById(thread.studentId).name+' · '+studentById(thread.studentId).parent;
  const avatar = thread => thread.type==='group' ? '<span class="wa-avatar wa-group-avatar">'+icon('group')+'</span>' : getViewer().role==='parent' ? '<span class="wa-avatar wa-brand-avatar"><img src="/brand/mathconcept-logo.png" width="2172" height="724" alt="MathConcept"></span>' : '<span class="wa-avatar '+studentById(thread.studentId).colour+'">'+esc(studentById(thread.studentId).initials)+'</span>';
  function visibleThreads() {
    const v=current(),viewer=getViewer();
    if(viewer.role!=='parent')return conversationThreads(getState(),{...viewer,query:v.query,filter:v.filter});
    const tokens=v.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return conversationThreads(getState(),{...viewer,filter:v.filter}).filter(thread=>{
      const student=studentById(thread.studentId);
      const searchable=[thread.title,title(thread),student.name,student.number,student.parent,student.phone,...thread.messages.map(message=>messageSearchText(thread,message))].join(' ').toLowerCase();
      const compact=searchable.replace(/[\s-]/g,'');
      return tokens.every(token=>searchable.includes(token)||compact.includes(token.replace(/-/g,'')));
    });
  }
  function tick(thread,message) {
    if(!message || !own(thread,message,getViewer()))return '';
    const read=(message.readBy||[]).some(key=>thread.type==='group'?key!==viewerKey(getViewer()):getViewer().role==='parent'?['admin','teacher'].includes(key):key==='parent:'+thread.studentId);
    const label=read?t('Read','已讀'):t('Sent','已傳送');
    return '<span class="wa-delivery'+(read?' read':'')+'" aria-label="'+label+'" title="'+label+'">'+icon(read?'checks':'check')+'</span>';
  }
  function listRow(thread) {
    const last=thread.messages.at(-1), v=current(), draft=v.drafts[thread.id];
    const lastStamp=last?.date==='2026-09-29'?t('Yesterday','昨天'):getViewer().role==='parent'&&last?.date&&last.date!==TODAY?familyDate(last.date,'parent'):last?.time||'';
    return button('thread',avatar(thread)+'<span class="wa-thread-copy"><span class="wa-thread-top"><span class="wa-thread-name">'+esc(title(thread))+'</span><span class="wa-thread-time'+(thread.unreadCount?' unread':'')+'">'+esc(lastStamp)+'</span></span><span class="wa-thread-preview"><span>'+(draft?'<span class="wa-draft-label">'+t('Draft: ','草稿：')+'</span>'+esc(draft):tick(thread,last)+esc(displayMessage(thread,last)||t('Start a conversation','開始對話')))+'</span><span class="wa-thread-indicators">'+(thread.favourite?icon('star'):'')+(thread.followUp&&getViewer().role!=='parent'?icon('flag'):'')+(thread.unreadCount?'<span class="wa-unread-count">'+thread.unreadCount+'</span>':'')+'</span></span></span>','wa-thread','data-id="'+thread.id+'" aria-current="'+(v.selected===thread.id)+'" aria-label="'+esc(title(thread)+(thread.type==='direct'?' · '+studentById(thread.studentId).name:'')+(thread.unreadCount?' · '+thread.unreadCount+t(' unread',' 則未讀訊息'):''))+'"');
  }
  function highlighted(text) {
    const query=current().chatQuery.trim(); if(!query)return esc(text);
    return String(text).split(new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig')).map((part,i)=>i%2?'<mark>'+esc(part)+'</mark>':esc(part)).join('');
  }
  function attachmentHtml(a) {
    if(!a)return '';
    if(a.kind==='image')return '<img class="wa-image-attachment" src="'+esc(a.dataUrl||a.url)+'" alt="'+esc(a.name)+'" loading="lazy">';
    return button('attachment',icon(a.kind==='worksheet'?'book':'file')+'<span>'+esc(attachmentName(a))+'</span>','wa-document-attachment','data-id="'+esc(a.worksheetId||'')+'"'+(a.kind==='worksheet'?' data-kind="worksheet"':''));
  }
  function messageRow(thread,message,previous) {
    const isOwn=own(thread,message,getViewer()), first=!previous||previous.senderKey!==message.senderKey||previous.date!==message.date;
    const quote=thread.messages.find(m=>m.id===message.replyToId);
    return '<div class="wa-message-row'+(isOwn?' own':'')+'" data-message-id="'+esc(message.id)+'"><div class="wa-message'+(first?' first':'')+'">'+(thread.type==='group'&&!isOwn&&first?'<span class="wa-sender">'+esc(message.senderName)+'</span>':'')+(quote?'<div class="wa-quote"><strong>'+esc(quote.senderName)+'</strong><span>'+esc(displayMessage(thread,quote))+'</span></div>':'')+attachmentHtml(message.attachment)+'<div class="wa-message-text">'+highlighted(displayText(thread,message))+'</div><span class="wa-message-meta">'+esc(message.time==='Yesterday'?'':message.time)+' '+tick(thread,message)+'</span>'+iconButton('message-menu','down',t('Message options','訊息選項'),'wa-message-menu-trigger','data-id="'+esc(message.id)+'"')+(current().menu==='message:'+message.id?'<div class="wa-menu wa-message-menu'+(current().menuBelow?' below':'')+'">'+button('reply',t('Reply','回覆'),'','data-id="'+esc(message.id)+'"')+'<div class="wa-reaction-picker">'+EMOJIS.slice(0,6).map(emoji=>button('react',emoji,'','data-id="'+esc(message.id)+'" data-emoji="'+emoji+'" aria-label="'+t('React ','回應 ')+emoji+'"')).join('')+'</div></div>':'')+((message.reactions||[]).length?'<div class="wa-reactions">'+message.reactions.map(r=>button('react',esc(r.emoji)+(r.by.length>1?' '+r.by.length:''),r.by.includes(viewerKey(getViewer()))?'active':'','data-id="'+esc(message.id)+'" data-emoji="'+esc(r.emoji)+'" aria-label="'+t('Reaction ','表情回應 ')+esc(r.emoji)+'" aria-pressed="'+r.by.includes(viewerKey(getViewer()))+'"')).join('')+'</div>':'')+'</div></div>';
  }
  function conversation(thread) {
    if(!thread)return '<div class="wa-chat-pane wa-empty-chat"><span class="wa-empty-icon">'+icon('new')+'</span><h2>'+t('Your conversations','你的對話')+'</h2><p>'+t('Select a chat to start messaging.','選擇對話以傳送訊息。')+'</p></div>';
    const v=current(), parent=getViewer().role==='parent', s=thread.type==='direct'?studentById(thread.studentId):null;
    const subtitle=s?(parent?s.name+' · 接待處及教學團隊':s.name+' · '+s.number):[centre.manager,(tutors.find(tutor=>tutor.id!==centre.managerId)||tutors[0]).name,'Reception'].join(', ');
    const matches=thread.messages.filter(m=>!v.chatQuery||messageSearchText(thread,m).includes(v.chatQuery.toLowerCase()));
    const visible=matches.slice(-v.messageLimit); let prev;
    const bubbles=visible.map(m=>{let html='';if(!prev||prev.date!==m.date)html='<div class="wa-day-label">'+esc(dayLabel(m.date))+'</div>';html+=messageRow(thread,m,prev);prev=m;return html;}).join('');
    const reply=thread.messages.find(m=>m.id===v.replies[thread.id]), attachment=v.attachments[thread.id];
    const hasMessage=Boolean(v.drafts[thread.id]?.trim()||attachment);
    return '<section class="wa-chat-pane" aria-label="'+esc(t('Conversation with ','與 ')+title(thread)+t('','的對話'))+'"><header class="wa-chat-header">'+iconButton('back','back',t('Back to chats','返回對話列表'),'wa-back')+avatar(thread)+'<div class="wa-chat-identity"><h2>'+esc(title(thread))+'</h2><p>'+esc(subtitle)+'</p></div><div class="wa-header-actions">'+iconButton('search-chat','search',t('Search conversation','搜尋對話'))+'</div></header>'+(v.searchOpen?'<div class="wa-chat-search">'+icon('search')+'<input id="wa-chat-search" placeholder="'+t('Search in conversation','搜尋對話內容')+'" aria-label="'+t('Search in conversation','搜尋對話內容')+'" value="'+esc(v.chatQuery)+'"><span>'+matches.length+'</span>'+iconButton('close-search','close',t('Close search','關閉搜尋'))+'</div>':'')+'<div class="wa-conversation-scroll" role="log" aria-label="'+t('Messages','訊息')+'">'+(matches.length>v.messageLimit?button('older',t('Load earlier messages','載入較早的訊息'),'wa-load-earlier'):'')+(bubbles||'<div class="wa-day-label">'+(v.chatQuery?t('No matching messages','找不到相符訊息'):t('Start a conversation','開始對話'))+'</div>')+'</div><div class="wa-compose-wrap">'+(reply?'<div class="wa-reply-preview"><div><strong>'+esc(reply.senderName)+'</strong><span>'+esc(displayMessage(thread,reply))+'</span></div>'+iconButton('cancel-reply','close',t('Cancel reply','取消回覆'))+'</div>':'')+(attachment?'<div class="wa-attachment-preview">'+(attachment.kind==='image'?'<img src="'+esc(attachment.dataUrl)+'" alt="'+t('Attachment preview','附件預覽')+'">':icon('file'))+'<span>'+esc(attachmentName(attachment))+'</span>'+iconButton('remove-attachment','close',t('Remove attachment','移除附件'))+'</div>':'')+'<div class="wa-composer">'+iconButton('attach-menu','plus',t('Attach','加入附件'),'', 'aria-expanded="'+(v.menu==='attach')+'"')+iconButton('emoji-menu','smile',t('Emoji','表情符號'),'', 'aria-expanded="'+(v.menu==='emoji')+'"')+'<textarea id="chat-input" rows="1" maxlength="4000" aria-label="'+t('Message','訊息')+'" placeholder="'+t('Type a message','輸入訊息')+'">'+esc(v.drafts[thread.id]||'')+'</textarea>'+iconButton('send','send',t('Send message','傳送訊息'),'wa-send'+(hasMessage?' active':''),hasMessage?'':'disabled')+'</div>'+(v.menu==='emoji'?'<div class="wa-emoji-picker" aria-label="'+t('Emoji','表情符號')+'">'+EMOJIS.map(emoji=>button('emoji',emoji,'','data-emoji="'+emoji+'" aria-label="'+t('Insert ','插入 ')+emoji+'"')).join('')+'</div>':'')+(v.menu==='attach'?'<div class="wa-menu wa-attachment-picker">'+button('choose-image',icon('image')+' '+t('Photos','相片'))+button('choose-document',icon('file')+' '+t('Document','文件'))+button('worksheet-picker',icon('book')+' '+t('Worksheet','工作紙'))+'</div>':'')+'<input type="file" id="wa-file" hidden aria-label="'+t('Choose an attachment','選擇附件')+'" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain"></div></section>';
  }
  function render() {
    const v=current(), key=viewerKey(getViewer()), old=document.querySelector('.wa-conversation-scroll'), oldList=document.querySelector('.wa-thread-scroll');
    if(renderedKey===key){if(old?.getClientRects().length)scrollTop=old.scrollTop;if(oldList?.getClientRects().length)listTop=oldList.scrollTop;}
    else {scrollTop=0;listTop=0;jumpBottom=true;}
    let threads=visibleThreads();
    if(!selected())v.selected=threads.find(t=>t.id==='thread-chloe')?.id||threads[0]?.id||null;
    const thread=selected();if(renderedThread!==thread?.id)jumpBottom=true;
    if(thread&&(renderedKey!==key||renderedThread!==thread.id)&&(v.open||(getViewer().role!=='parent'&&matchMedia('(min-width: 761px)').matches))){markConversationRead(getState(),thread.id,getViewer());persist();threads=visibleThreads();}
    renderedKey=key;renderedThread=thread?.id;
    const archived=conversationThreads(getState(),{...getViewer(),filter:'archived'}).length;
    const parent=getViewer().role==='parent';
    return '<h1 class="visually-hidden">'+t('Conversations','對話')+'</h1><section class="wa-inbox'+(v.open?' wa-show-chat':'')+'" aria-label="'+t('Chats','對話')+'"><aside class="wa-chat-list"><header class="wa-list-header"><h2>'+(v.filter==='archived'?t('Archived','已封存'):t('Chats','對話'))+'</h2><div class="wa-header-actions">'+iconButton('new','new',t('New chat','新對話'))+'</div></header>'+(parent?'<div class="wa-child-switch">'+childSwitch()+'</div>':'')+'<div class="wa-search">'+icon('search')+'<input id="wa-list-search" aria-label="'+t('Search chats','搜尋對話')+'" placeholder="'+t('Search or start a new chat','搜尋或開始新對話')+'" value="'+esc(v.query)+'">'+(v.query?iconButton('clear-search','close',t('Clear search','清除搜尋')):'')+'</div>'+(v.filter!=='archived'?(archived?button('filter',icon('archive')+'<span>'+t('Archived','已封存')+'</span>'+(archived?'<span class="wa-archive-count">'+archived+'</span>':''),'wa-archived','data-filter="archived"'):''):button('filter',icon('back')+'<span>'+t('All chats','所有對話')+'</span>','wa-archived','data-filter="all"'))+'<div class="wa-thread-scroll">'+threads.slice(0,v.limit).map(listRow).join('')+(!threads.length?'<div class="wa-list-empty">'+(v.query?t('No chats found','找不到對話'):t('No conversations','暫無對話'))+'</div>':'')+(threads.length>v.limit?'<div class="wa-list-footer">'+button('more-chats',t('Load more chats','載入更多對話'))+'</div>':'')+'</div></aside>'+conversation(thread)+'</section>';
  }
  function afterRender() {
    const v=current();document.body.classList.toggle('wa-chat-open',v.open);
    const scroll=document.querySelector('.wa-conversation-scroll');if(scroll)scroll.scrollTop=jumpBottom?scroll.scrollHeight:scrollTop;jumpBottom=false;
    const list=document.querySelector('.wa-thread-scroll');if(list)list.scrollTop=listTop;
    if(focusAfter){const input=document.getElementById(focusAfter.id);input?.focus();if(input&&focusAfter.position!==undefined)input.setSelectionRange(focusAfter.position,focusAfter.position);focusAfter=null;}
    resizeComposer();
    // Consume once: message updates, search and composer redraws stay still.
    const motion=navigationMotion;navigationMotion=null;
    if(motion?.viewer===viewerKey(getViewer())){
      const forward=motion.direction==='forward';
      const focusTarget=document.querySelector(forward?'.wa-back':'.wa-thread[aria-current="true"]');
      if(focusTarget?.getClientRects().length)focusTarget.focus({preventScroll:true});
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector(forward?'.wa-chat-pane':'.wa-chat-list')?.animate?.([
        {transform:'translateX('+(forward?32:-24)+'px)',opacity:.72},
        {transform:'translateX(0)',opacity:1}
      ],{duration:220,easing:'cubic-bezier(.22,.61,.36,1)'});
    }
  }
  function redraw(focusId,position) {if(focusId)focusAfter={id:focusId,position};renderApp();}
  function navigate(direction){navigationMotion={direction,viewer:viewerKey(getViewer())};redraw();}
  function resizeComposer() {const input=document.getElementById('chat-input');if(input){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';}}
  function openThread(id) {const t=threadById(id);if(!t)return;const v=current(),changed=!v.open||v.selected!==id;v.selected=id;v.open=true;v.messageLimit=50;v.chatQuery='';v.searchOpen=false;v.menu=null;markConversationRead(getState(),id,getViewer());persist();jumpBottom=true;if(changed)navigate('forward');else redraw();}
  function newChat() {
    if(getViewer().role==='parent'){startStudentChat(getViewer().studentId);return;}
    pickerQuery='';pickerLimit=20;
    modal(t('New chat','新對話'),'<div class="wa-search">'+icon('search')+'<input id="wa-contact-search" aria-label="Search contacts" placeholder="Search student, parent or ID"></div><div id="wa-contact-results" class="wa-contact-results"></div>');
    updateContacts();
  }
  function updateContacts() {
    const query=pickerQuery.trim().toLowerCase().replace(/[\s-]/g,'');
    const contacts=students.filter(s=>(s.name+' '+s.parent+' '+s.number).toLowerCase().replace(/[\s-]/g,'').includes(query));
    const results=document.getElementById('wa-contact-results');if(!results)return;
    results.innerHTML=contacts.slice(0,pickerLimit).map(s=>button('contact','<span class="wa-avatar '+s.colour+'">'+esc(s.initials)+'</span><span><strong>'+esc(s.parent)+'</strong><small>'+esc(s.name)+' · '+s.number+'</small></span>','wa-contact','data-id="'+s.id+'"')).join('')+(contacts.length>pickerLimit?button('more-contacts','Load more','wa-contact-more'):'')+(!contacts.length?'<p>No contacts found.</p>':'');
  }
  function startStudentChat(studentId) {
    if(!students.some(s=>s.id===studentId)||(getViewer().role==='parent'&&studentId!==getViewer().studentId))return;
    let t=getState().messages.find(t=>t.type!=='group'&&t.studentId===studentId);
    if(!t){t={id:uid('thread'),type:'direct',studentId,assignedTo:'Reception',followUp:false,messages:[]};getState().messages.push(t);}
    current().filter='all';current().query='';closeModal();openThread(t.id);
  }
  function send() {
    const t=selected(),v=current();if(!t)return;
    const text=document.getElementById('chat-input')?.value ?? v.drafts[t.id] ?? '';
    if(!text.trim()&&!v.attachments[t.id])return;
    sendConversationMessage(getState(),t.id,{viewer:getViewer(),text,replyToId:v.replies[t.id],attachment:v.attachments[t.id]});
    delete v.drafts[t.id];delete v.replies[t.id];delete v.attachments[t.id];v.menu=null;v.chatQuery='';v.searchOpen=false;
    markConversationRead(getState(),t.id,getViewer());persist();jumpBottom=true;redraw('chat-input');
  }
  function handleAction(action,id,el) {
    const a=action.replace(/^wa-/,''),v=current(),thread=selected();
    try {
      if(a==='thread'){openThread(id);return;}
      if(a==='back'){v.open=false;v.menu=null;navigate('back');return;}
      if(a==='filter'){v.filter=el.dataset.filter;v.limit=30;v.menu=null;listTop=0;redraw();return;}
      if(a==='more-chats'){v.limit+=30;redraw();return;}
      if(a==='clear-search'){v.query='';redraw('wa-list-search');return;}
      if(a==='new'){newChat();return;}
      if(a==='contact'){startStudentChat(id);return;}
      if(a==='more-contacts'){pickerLimit+=20;updateContacts();return;}
      if(!thread)return;
      if(a==='send'){send();return;}
      if(a==='search-chat'){v.searchOpen=!v.searchOpen;v.chatQuery='';v.menu=null;redraw(v.searchOpen?'wa-chat-search':null);return;}
      if(a==='close-search'){v.searchOpen=false;v.chatQuery='';redraw();return;}
      if(a==='older'){v.messageLimit+=50;redraw();return;}
      if(a==='emoji-menu'||a==='attach-menu'){const menu=a.split('-')[0];v.menu=v.menu===menu?null:menu;redraw();return;}
      if(a==='message-menu'){v.menuBelow=el.getBoundingClientRect().top-document.querySelector('.wa-conversation-scroll').getBoundingClientRect().top<160;v.menu=v.menu==='message:'+id?null:'message:'+id;redraw();return;}
      if(a==='reply'){v.replies[thread.id]=id;v.menu=null;redraw('chat-input');return;}
      if(a==='cancel-reply'){delete v.replies[thread.id];redraw('chat-input');return;}
      if(a==='react'){toggleConversationReaction(getState(),thread.id,id,getViewer(),el.dataset.emoji);v.menu=null;persist();redraw();return;}
      if(a==='emoji'){v.drafts[thread.id]=(v.drafts[thread.id]||'')+el.dataset.emoji;redraw('chat-input');return;}
      if(a==='choose-image'||a==='choose-document'){const input=document.getElementById('wa-file');input.accept=a==='choose-image'?'image/png,image/jpeg,image/webp,image/gif':'application/pdf,text/plain';input.click();return;}
      if(a==='remove-attachment'){delete v.attachments[thread.id];redraw();return;}
      if(a==='worksheet-picker'){v.menu=null;modal(t('Share a worksheet','分享工作紙'),'<div class="wa-contact-results">'+worksheets.map(w=>button('share-worksheet',icon('book')+'<span><strong>'+esc(contentLabel(w.title))+'</strong><small>'+esc(textLabel(w.level))+' · '+esc(contentLabel(w.topic))+'</small></span>','wa-contact','data-id="'+w.id+'"')).join('')+'</div>');return;}
      if(a==='share-worksheet'){const w=worksheets.find(w=>w.id===id);if(w)v.attachments[thread.id]={kind:'worksheet',name:w.title,worksheetId:w.id};closeModal();redraw('chat-input');return;}
      if(a==='attachment'){const w=worksheets.find(w=>w.id===id);if(w)modal(esc(contentLabel(w.title)),'<p>'+esc(textLabel(w.level))+' · '+esc(contentLabel(w.topic))+'</p><p class="mt-16">'+esc(w.description?contentLabel(w.description):t('Open this worksheet from the student learning folder.','請從學生的學習資料夾開啟這份工作紙。'))+'</p>');else {const m=thread.messages.find(m=>m.id===el.closest('[data-message-id]')?.dataset.messageId),a=m?.attachment;if(a?.dataUrl)modal(esc(a.name),'<a class="btn primary" href="'+esc(a.dataUrl)+'" download="'+esc(a.name)+'">'+t('Download document','下載文件')+'</a>');}return;}
    } catch(error){toast(errorMessage(error.message),false,true);}
  }
  function onInput(e) {
    const id=e.target.id,v=current();
    if(id==='chat-input'){if(!selected())return true;v.drafts[v.selected]=e.target.value;const has=Boolean(e.target.value.trim()||v.attachments[v.selected]),send=document.querySelector('.wa-send');send.disabled=!has;send.classList.toggle('active',has);resizeComposer();return true;}
    if(id==='wa-list-search'||id==='wa-chat-search'){v[id==='wa-list-search'?'query':'chatQuery']=e.target.value;if(id==='wa-list-search')v.limit=30;redraw(id,e.target.selectionStart);return true;}
    if(id==='wa-contact-search'){pickerQuery=e.target.value;pickerLimit=20;updateContacts();return true;}
    return false;
  }
  function onChange(e) {
    if(e.target.id!=='wa-file')return false;
    const file=e.target.files[0],v=current(),threadId=v.selected;if(!file)return true;
    if(file.size>2*1024*1024){toast(t('Choose a file smaller than 2 MB for this demo.','此示範只支援小於 2 MB 的檔案。'),false,true);return true;}
    if(!['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain'].includes(file.type)){toast(t('Choose an image, PDF or text file.','請選擇圖片、PDF 或文字檔。'),false,true);return true;}
    const reader=new FileReader();reader.onload=()=>{v.attachments[threadId]={kind:file.type.startsWith('image/')?'image':'document',name:file.name,dataUrl:reader.result,mimeType:file.type,size:file.size};v.menu=null;if(v===current())redraw('chat-input');};reader.onerror=()=>toast(t('This file could not be opened.','無法開啟此檔案。'),false,true);reader.readAsDataURL(file);return true;
  }
  function onKeyDown(e) {
    if(e.target.id==='chat-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();try{send();}catch(error){toast(errorMessage(error.message),false,true);}return true;}
    if(e.key==='Escape'&&current().menu&&!document.getElementById('overlay')?.children.length){current().menu=null;redraw();return true;}
    return false;
  }
  function onDocumentClick(e) {
    if(!current().menu||e.target.closest('.wa-menu,.wa-emoji-picker,[data-action^="wa-"]'))return;
    current().menu=null;document.querySelectorAll('.wa-menu,.wa-emoji-picker').forEach(el=>el.remove());document.querySelectorAll('.wa-inbox [aria-expanded="true"]').forEach(el=>el.setAttribute('aria-expanded','false'));
  }
  return {render,afterRender,handleAction,onInput,onChange,onKeyDown,onDocumentClick,reset(){views.clear();renderedKey='';renderedThread='';jumpBottom=true;navigationMotion=null;}};
}
