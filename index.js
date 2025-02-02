const http = require('http');
const fs = require('fs');
const { Client, GatewayIntentBits,TextChannel ,EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { Server } = require('socket.io');
const logger = require("./logger.js")
const { Kysely, SqliteDialect } = require('kysely');
const Database = require('better-sqlite3');

const db = new Kysely({
  dialect: new SqliteDialect({ database: new Database('users.db') }),
});
async function createTable() {
    await db.schema
      .createTable('users')
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('email', 'text', (col) => col.notNull().unique())
      .addColumn('password', 'text', (col) => col.notNull())
      .addColumn('settings', 'text', (col) => col.notNull())
      .ifNotExists()
      .execute();
  
  }
  createTable();
const client = new Client({intents: [Object.values(GatewayIntentBits)]});
const server = http.createServer(function(req, res) {
    const pagelist = [{root:"/",file:"./htmls/index.html",type:"text/html"},{root:"/sidber.js",file:"./sidber.js", type:"text/javascript"},{root:"/style.css",file:"./style.css",type:"text/css"},{root:"/favicon.ico",file:"./htmls/favicon.ico",type:"image/x-icon"},{root:"/feedback.html",file:"./htmls/feedback.html",type:"text/html"},{root:"/setting.html",file:"./htmls/setting.html",type:"text/html"},{root:"/register.html",file:"./htmls/register.html",type:"text/html"},{root:"/login.html",file:"./htmls/login.html",type:"text/html"},{root:"/chat.html",file:"./htmls/chat.html",type:"text/html"}];
    try {
    for(const p of pagelist) {
        if(req.url === p.root){
            fs.readFile(p.file,(err,data) =>{
                try {
                if(err){
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end('Internal Server Error');
                    logger.error(err)
                    return;
                }
                res.writeHead(200,{'Content-Type':p.type});
                res.end(data);
            } catch (e) {
                logger.error(e)
            }
            });
            return; // ここでリクエストハンドラを終了
        }
    }

    // マッチするルートが見つからない場合のみ 404 を返す
    res.writeHead(404,{'Content-Type':'text/html'});
    res.end(fs.readFileSync("./htmls/404.html"));
} catch (e) {
    logger.error(e)
}
}).listen(8080,() => {
    logger.log('Server is running on port 8080');
});

const io = new Server(server,{serveClient: false});
io.on("connection", (socket) => {
    socket.on("feedback",async (data) =>{
        const guild = await client.guilds.fetch("1335417481799536640");
        /** @type {TextChannel} */
        const channel = await guild.channels.fetch("1335426312751550528");
        //embedでdiscordに送信
        channel.send({embeds:[{title:"フィードバック",description:`連絡先:${data.email} \n内容:${data.text}`}]});
    })

    socket.on("register", async (data) => {
        try {
            // メールアドレスの重複チェック
            const existingUser = await db
                .selectFrom('users')
                .select('email')
                .where('email', '=', data.email)
                .executeTakeFirst();
    
            if (existingUser) {
                socket.emit("register-fail", { message: "このメールアドレスは既に登録されています" });
                return;
            }
    
            // ユーザー登録
            await db
                .insertInto('users')
                .values({
                    name: data.username,
                    email: data.email,
                    password: data.password,
                    settings: JSON.stringify({})
                })
                .execute();
    
            socket.emit("register-success", {
                name: data.username,
                email: data.email,
                password: data.password,
                settings: {}
            });
    
        } catch (error) {
            logger.error("登録エラー:", error);
            socket.emit("register-fail", { message: "登録処理中にエラーが発生しました" });
        }
    });
    socket.on("check", async (data) => {
        try {
            if (!data?.email || !data?.password) {
                socket.emit("check", null);
                return;
            }

            const user = await db
                .selectFrom('users')
                .select('id')
                .where('email', '=', data.email)
                .where('password', '=', data.password)
                .executeTakeFirst();

            socket.emit("check", user ? "ok" : null);
        } catch (error) {
            logger.error("認証チェックエラー:", error);
            socket.emit("check", null);
        }
    });

    socket.on("login", async (data) => {
        try {
            if (!data.email || !data.password) {
                socket.emit("login-fail", { message: "メールアドレスとパスワードを入力してください" });
                return;
            }

            const result = await db
                .selectFrom('users')
                .select(['id', 'email', 'name', 'settings', 'password']) // パスワードを追加
                .where((eb) => eb.and([
                    eb('email', '=', data.email),
                    eb('password', '=', data.password)
                ]))
                .executeTakeFirst();


            if (!result) {
                socket.emit("login-fail", { message: "メールアドレスまたはパスワードが間違っています" });
                return;
            }

            const userData = {
                id: result.id,
                email: result.email,
                name: result.name,
                password: result.password, // パスワードを含める
                settings: JSON.parse(result.settings || '{}')
            };
            socket.emit("login-success", userData);
        } catch (e) {
            logger.error("ログインエラー:", e);
            socket.emit("login-fail", { message: "ログイン処理中にエラーが発生しました" });
        }
    });

    socket.on("update_username", async (data) => {
        try {
            await db
                .updateTable('users')
                .set({ name: data.username })
                .where('email', '=', data.data.email)
                .where('password', '=', data.data.password)
                .execute();
            socket.emit("updatesuccess", { username: data.username });
        } catch (error) {
            logger.error("ユーザー名変更エラー:", error);
            socket.emit("update-fail", { message: "ユーザー名の変更に失敗しました" });
        }
    }
    );
    socket.on("update_password", async (data) => {
        try {
            await db
                .updateTable('users')
                .set({password: data.password})
                .where('email', '=', data.data.email)
                .where('password', '=', data.data.password)
                .execute();
            socket.emit("updatesuccess", { password: data.password });
        } catch (error) {
            logger.error("パスワード変更エラー:", error);
            socket.emit("update-fail", { message: "パスワードの変更に失敗しました" });
        }
    }
    );
    
    socket.on("disconnect", () => {
    });
});
//1335417481799536643にメッセージが送信された場合はevalする
client.on("messageCreate", async (message) => {
    if (message.channel.id !== "1335417481799536643") return;
    if (message.author.id === client.user.id) return;
    try {
        const result = eval(message.content);
        logger.log(result);
        send()
    } catch (e) {
        logger.error(e);
        send()        
        const commands = [
            new SlashCommandBuilder()
                .setName('getallusers')
                .setDescription('すべてのユーザーを表示します'),
            new SlashCommandBuilder()
                .setName('deleteuser')
                .setDescription('ユーザーを削除します')
                .addStringOption(option => 
                    option.setName('email')
                        .setDescription('削除するユーザーのメールアドレス')
                        .setRequired(true)
                )
        ];
        
        client.on('interactionCreate', async interaction => {
            if (interaction.isCommand()) {
                try {
                    switch (interaction.commandName) {
                        case 'getallusers':
                            const users = await db
                                .selectFrom('users')
                                .select(['id', 'name', 'email'])
                                .execute();
                            
                            await interaction.reply({
                                embeds: [{
                                    title: 'ユーザー一覧',
                                    description: users.map(user => 
                                        `ID: ${user.id} | 名前: ${user.name} | メール: ${user.email}`
                                    ).join('\n')
                                }],
                                ephemeral: true
                            });
                            break;
        
                        case 'deleteuser':
                            const email = interaction.options.getString('email');
                            const result = await db
                                .deleteFrom('users')
                                .where('email', '=', email)
                                .execute();
        
                            await interaction.reply({
                                content: result.numDeletedRows > 0 
                                    ? `ユーザー ${email} を削除しました`
                                    : `ユーザー ${email} は見つかりませんでした`,
                                ephemeral: true
                            });
                            break;
                    }
                } catch (error) {
                    logger.error('コマンドエラー:', error);
                    await interaction.reply({
                        content: 'エラーが発生しました',
                        ephemeral: true
                    });
                }
            }
        });
    }})
client.on('ready', () => {
    logger.log(`${client.user.tag}でログインしました`);
});
client.login("")
this.c = setInterval(async () => {
    await send()
}, 5000);
client.on("error", logger.error)
async function send(){
    const guild = await client.guilds.fetch("1335417481799536640");
    /** @type {TextChannel} */
    // @ts-ignore
    const channel = await guild.channels.fetch("1335417481799536643");
    if (fs.readFileSync("./logs.txt","utf-8") =="") return
        channel.send("```diff"+`\n${fs.readFileSync("./logs.txt","utf-8")}`+"\n```"); 
        // @ts-ignore
        fs.writeFileSync('./logs.txt',"","utf-8", (err) => {
          if(err) {
            this.logger.error(err)
          }})
}
//全てのユザーを取得する関数
 async function getAllUsers() {
    try {
    const query = db
        .selectFrom('users').selectAll()
        .execute();
    const r = await query;
    logger.log(JSON.stringify(r, null, 2));
    send()
    return r; 
    } catch (e) {
        logger.error(e)
    }
}
//ユザーを消す関数
async function deleteUser(email) {
    try {
    const query = db
        .deleteFrom('users')
        .where('email', '=', email)
        .execute();
    await query;
    } catch (e) {
        logger.error(e)
    }
}

// コマンド登録
client.on('ready', async () => {
    const commands = [
        new SlashCommandBuilder()
            .setName('getallusers')
            .setDescription('すべてのユーザーを表示します'),
        new SlashCommandBuilder()
            .setName('deleteuser')
            .setDescription('ユーザーを削除します')
            .addStringOption(option => 
                option.setName('email')
                    .setDescription('削除するユーザーのメールアドレス')
                    .setRequired(true)
                    .setAutocomplete(true)  // autocomplete()からsetAutocomplete(true)に修正
            )
    ];

    await client.application.commands.set(commands);
    logger.log('スラッシュコマンドを登録しました');
});

// コマンドハンドラー
client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'deleteuser') {

            try {
                const emails = await db
                    .selectFrom('users')
                    .select('email')
                    .execute();
                await interaction.respond(
                    emails.map(e => ({ name: e.email, value: e.email }))
                );
            } catch (error) {
                logger.error('Autocomplete エラー:', error);
            }
        }
        return;
    }

    if (!interaction.isCommand()) return;

    try {
        switch (interaction.commandName) {
            case 'getallusers':
                const users = await db
                    .selectFrom('users')
                    .select(['id', 'name', 'email'])
                    .execute();
                
                await interaction.reply({
                    embeds: [{
                        title: 'ユーザー一覧',
                        description: users.map(user => 
                            `ID: ${user.id} | 名前: ${user.name} | メール: ${user.email}`
                        ).join('\n')
                    }],
                    ephemeral: true
                });
                break;

            case 'deleteuser':
                const email = interaction.options.getString('email');
                const result = await db
                    .deleteFrom('users')
                    .where('email', '=', email)
                    .execute();

                await interaction.reply({
                    content: `ユーザー ${email} を削除しました`,
                    ephemeral: true
                });
                break;
        }
    } catch (error) {
        logger.error('コマンドエラー:', error);
        await interaction.reply({
            content: 'エラーが発生しました',
            ephemeral: true
        });
    }
});