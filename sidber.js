const p = [
  { name: "ホーム", url: "/" },
  { name: "チャットルーム", url: "chat.html" },
  {name:"アカウント登録",url:"register.html"},
  {name:"設定",url:"setting.html"},
  {name:"フィードバック",url:"feedback.html"}

];
var socket = io();

let username = ""
const logindata = window.localStorage.getItem("login")
if (logindata) {
  if (logindata == "none"){
      window.localStorage.removeItem("login")
      window.location.href = "/login.html"
  }
  username = JSON.parse(logindata).name
  socket.emit("check", JSON.parse(logindata))
  socket.on("check", (data) => {
    if (!data) {
      window.localStorage.removeItem("login")
      window.location.href = "/login.html"
      alert("ログアウトしました")
    }
  })
}
document.addEventListener("DOMContentLoaded", async () => {
    const mediaQuery = window.matchMedia('(max-device-width: 480px)')
  mediaQuery.addEventListener('change', handleMediaChange)
  handleMediaChange(mediaQuery)

  const div = document.getElementById("l");
  if (!div) return;
  function handleMediaChange(mediaQuery) {
    const div = document.getElementById("l");
    if (mediaQuery.matches) {
      var navListItems = "";
      p.forEach(async (json) => {
        navListItems += `<li><a href="${json.url}">${json.name}</a></li>\n`;
      });
      if (!div) return

      div.innerHTML = `
    <div id="navArea">
      <nav>
        <div class="inner">
          <ul>
            ${navListItems}
          </ul>
        </div>
      </nav>
      <div class="toggle_btn">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div id="mask"></div>
    </div>
    <span>${username}</span>


  `;
      (function ($) {
        const $nav = $('#navArea');
        const $btn = $('.toggle_btn');
        const $mask = $('#mask');
        const open = 'open';

        $btn.on('click', function () {
          if (!$nav.hasClass(open)) {
            $nav.addClass(open);
          } else {
            $nav.removeClass(open);
          }
        });

        $mask.on('click', function () {
          $nav.removeClass(open);
        });
      })(jQuery);
    } else {
      var e = "";
      p.forEach(async (json) => {
        e += `<button onclick="window.location.href = '${json.url}'" type="button" class="nav-button" style="margin-top: -11px;
        margin-left: -10px;
        padding: 10px 20px;
        background-color: #4a90e2;
        color: #ffffff;
        border: none;
        cursor: pointer;
        transition: background-color 0.3s ease-in-out;">${json.name}</button>\n`
      })
      div.innerHTML = `
    ${e}     <span>${username}</span>

    `

    }
  }
  
});
