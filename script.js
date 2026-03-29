//   BRAINZAP – Dynamic Quiz App
//    Concepts used:
//    ✅ DOM Manipulation  – build UI elements dynamically
//    ✅ Simulated AJAX    – fetchQuestions() with setTimeout
//    ✅ jQuery-style $()  – custom selector helpers
//    ✅ Local Storage     – leaderboard persists across sessions
// ============================================= */

/* ── Lightweight jQuery-style helpers ── */
const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const on = (el, ev, fn) => el.addEventListener(ev, fn);

/* ── State ── */
let questions=[], idx=0, score=0, numCorrect=0, numWrong=0;
let answered=false, timerID=null, timeLeft=15, lastScore=0;
const MAX_TIME=15;
let selectedCat='general', selectedDiff='easy';

/* ── Utilities ── */
function showScreen(id){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
}
function toast(msg,ms=2200){
  const t=$(  'toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),ms);
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

/* ── Category click (DOM Event) ── */
on($('cat-grid'),'click',function(e){
  const btn=e.target.closest('.cat-btn');
  if(!btn)return;
  $$('.cat-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedCat=btn.dataset.cat;
});

/* ── Difficulty click ── */
on($('diff-row'),'click',function(e){
  const btn=e.target.closest('.diff-btn');
  if(!btn)return;
  $$('.diff-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDiff=btn.dataset.diff;
});

/* ── Simulated AJAX (setTimeout mimics network fetch) ── */
function fetchQuestions(cat, diff, callback){
  fetch('questions.json')
    .then(res => res.json())
    .then(data => {
      const pool = data[cat] && data[cat][diff];
      if(!pool) return callback(null, 'Not found');
      callback(shuffle(pool).slice(0,10), null);
    })
    .catch(() => callback(null, 'Error loading'));
}

/* ── Start Quiz ── */
on($('start-btn'),'click',function(){
  // Show quiz screen with loading state
  showScreen('quiz-screen');
  $('q-text').textContent='Fetching questions…';
  $('options').innerHTML='';
  $('next-btn').style.display='none';
  $('explanation').style.display='none';
  $('prog').style.width='0%';

  // Simulated AJAX call
  fetchQuestions(selectedCat,selectedDiff,function(data,err){
    if(err||!data){ toast('⚠️ Failed to load!'); showScreen('home-screen'); return; }
    questions=data; idx=0; score=0; numCorrect=0; numWrong=0;
    $('live-score').textContent='0';
    $('q-total').textContent=questions.length;
    renderQuestion();
  });
});

/* ── Render Question (DOM Manipulation) ── */
function renderQuestion(){
  answered=false;
  clearInterval(timerID);
  const q=questions[idx];
  const letters=['A','B','C','D'];

  $('prog').style.width=((idx/questions.length)*100)+'%';
  $('q-num').textContent=idx+1;
  $('next-btn').style.display='none';
  $('explanation').style.display='none';
  $('q-text').textContent=q.q;

  // Build option buttons dynamically
  const container=$('options');
  container.innerHTML='';
  shuffle(q.opts).forEach(function(opt,i){
    const btn=document.createElement('button');
    btn.className='opt-btn';
    btn.dataset.answer=opt;
    btn.innerHTML='<span class="opt-letter">'+letters[i]+'</span><span>'+opt+'</span>';
    btn.addEventListener('click',onAnswer);
    container.appendChild(btn);
  });

  startTimer();
}

/* ── Timer ── */
function startTimer(){
  timeLeft=MAX_TIME;
  updateTimer();
  timerID=setInterval(function(){
    timeLeft--;
    updateTimer();
    if(timeLeft<=0){
      clearInterval(timerID);
      if(!answered){
        answered=true; numWrong++;
        toast("⏰ Time's up!");
        lockOptions(null);
        showExplanation();
        showNextBtn();
      }
    }
  },1000);
}
function updateTimer(){
  const pct=(timeLeft/MAX_TIME)*100;
  const f=$('timer-fill');
  f.style.width=pct+'%';
  f.className='timer-fill';
  if(timeLeft<=5)f.classList.add('danger');
  else if(timeLeft<=9)f.classList.add('warn');
  $('timer-num').textContent=timeLeft;
}

/* ── Answer ── */
function onAnswer(e){
  if(answered)return;
  answered=true;
  clearInterval(timerID);
  const btn=e.currentTarget;
  const chosen=btn.dataset.answer;
  const correct=questions[idx].a;
  if(chosen===correct){
    btn.classList.add('correct');
    const pts=timeLeft*10;
    score+=pts; numCorrect++;
    $('live-score').textContent=score;
    toast('✅ Correct! +'+pts+' pts');
  } else {
    btn.classList.add('wrong');
    numWrong++;
    toast('❌ Wrong!');
  }
  lockOptions(correct);
  showExplanation();
  showNextBtn();
}
function lockOptions(correctAns){
  $$('.opt-btn').forEach(function(btn){
    btn.disabled=true;
    if(correctAns&&btn.dataset.answer===correctAns)btn.classList.add('correct');
  });
}
function showExplanation(){
  const el=$('explanation');
  el.innerHTML='<b>✅ Correct Answer:</b> '+questions[idx].a;
  el.style.display='block';
}
function showNextBtn(){
  const btn=$('next-btn');
  btn.textContent=idx<questions.length-1?'Next →':'See Results 🏆';
  btn.style.display='inline-block';
}

on($('next-btn'),'click',function(){
  idx++;
  if(idx<questions.length){ renderQuestion(); }
  else{ clearInterval(timerID); showResults(); }
});

/* ── Results + Local Storage ── */
function showResults(){
  showScreen('result-screen');
  lastScore=score;
  const pct=Math.round((numCorrect/questions.length)*100);
  let emoji,title,sub;
  if(pct>=90){emoji='🏆';title='Legendary!';sub='You\'re a trivia master!';}
  else if(pct>=70){emoji='🎯';title='Excellent!';sub='You really know your stuff!';}
  else if(pct>=50){emoji='👍';title='Good Job!';sub='Solid effort — keep it up!';}
  else if(pct>=30){emoji='🤔';title='Keep Going!';sub='Study up and try again!';}
  else{emoji='💡';title='Try Again!';sub='Every expert was once a beginner.';}
  $('r-emoji').textContent=emoji;
  $('r-title').textContent=title;
  $('r-sub').textContent=sub;
  $('r-score').textContent=score;
  $('r-correct').textContent=numCorrect;
  $('r-wrong').textContent=numWrong;

  // ── LOCAL STORAGE ──
  const catEl=document.querySelector('.cat-btn.selected');
  const catName=catEl?catEl.textContent.trim():selectedCat;
  const entry={score,correct:numCorrect,total:questions.length,cat:catName,diff:selectedDiff,date:new Date().toLocaleDateString()};
  let board=JSON.parse(localStorage.getItem('brainzap_board')||'[]');
  board.push(entry);
  board.sort((a,b)=>b.score-a.score);
  board=board.slice(0,5);
  localStorage.setItem('brainzap_board',JSON.stringify(board));
  renderLeaderboard(board);
}

function renderLeaderboard(board){
  const list=$('lb-list');
  const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
  list.innerHTML='';
  if(!board.length){list.innerHTML='<div class="lb-empty">No scores yet!</div>';return;}
  const newIdx=board.findIndex(r=>r.score===lastScore);
  board.forEach(function(row,i){
    const div=document.createElement('div');
    div.className='lb-row'+(i===newIdx?' me':'');
    div.innerHTML='<span class="lb-rank">'+(medals[i]||(i+1))+'</span>'
      +'<span class="lb-name">'+row.cat+' · <em style="font-size:11px;color:var(--muted)">'+row.diff+'</em></span>'
      +'<span class="lb-score">'+row.score+' pts</span>'
      +'<span class="lb-date">'+row.date+'</span>';
    list.appendChild(div);
  });
}

on($('home-btn'),'click',function(){ clearInterval(timerID); showScreen('home-screen'); });
on($('retry-btn'),'click',function(){ $('start-btn').click(); });

/* ── Init ── */
(function(){
  const b=JSON.parse(localStorage.getItem('brainzap_board')||'[]');
  if(b.length) setTimeout(()=>toast('🏅 Best score: '+b[0].score+' pts',3000),600);
})();