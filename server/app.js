const http = require('http');
const { Server } = require("socket.io");
const express = require('express');
const app = express();
const serverHttp = http.createServer(app);
const io = new Server(serverHttp);

const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const session = require("express-session");
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const connect = require('./connection.js')
const EventEmitter = require('events')
const Emmiter = new EventEmitter();

const checkLogin = (req, res, next) => {
    if (!req.session.user) {
        // Se o usuário não estiver logado, armazene a URL de origem
        req.session.returnTo = req.originalUrl;
        return res.redirect('/');
    }
    next();
};

let date;
setInterval(() => {
    date = new Date()
}, 1000);

const {
    log
} = require('handlebars');
const { profile } = require('console');

function padNumber(number) {
    return number.toString().padStart(2, '0');
}

app.engine('handlebars', handlebars.engine({
    defaultLayout: 'main',
    helpers: {
        eq: function (a, b) {
            return a === b;
        },
        formatDate: function (date) {
            if (date) {
                const dataObj = new Date(date);
                const formattedDate = `${dataObj.getHours()}:${padNumber(dataObj.getMinutes())}`;
                return formattedDate;
            }
        },
    }
}
));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let destinationDirectory = '';

        if (file.mimetype.includes('audio')) {
            destinationDirectory = 'public/audios/';
        } else if (file.mimetype.includes('image')) {
            destinationDirectory = 'public/images/';
        } else if (file.mimetype.includes('video')) {
            destinationDirectory = 'public/videos/';
        } else {
            destinationDirectory = 'public/docs/';
        }

        cb(null, destinationDirectory);
    },

    filename: (req, file, cb) => {
        if (file.fieldname === 'profilePicPath') {
            const ext = path.extname(file.originalname);
            cb(null, req.session.user[0].name + ext)
        }
        const ext = path.extname(file.originalname);
        const hora = date.getHours().toString().padStart(2, '0');
        const minuto = date.getMinutes().toString().padStart(2, '0');
        const segundo = date.getSeconds().toString().padStart(2, '0');
        cb(null, `${hora};${minuto};${segundo}${ext}`);
    },
});
const upload = multer({ storage: storage });

app.set('view engine', 'handlebars');
app.use(session({
    secret: "@nX%7A_18",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 },
}))

app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())
app.use(express.static('public'));

app.get('/', async (req, res) => {
    if (req.session.user) {
        res.redirect('/logged')
    } else {
        res.render('accessControl/login')
    }
})

app.get('/userRegister', checkLogin, async (req, res) => {
    res.render('accessControl/register')
})

app.post('/userRegister', async (req, res) => {
    const { username, name, department, pass } = req.body

    await connect.userRegister(username, name, department, pass)
    res.redirect('/')
})

app.post('/login', async (req, res) => {
    const { username, pass } = req.body
    const returnTo = req.session.returnTo || '/logged'; // Pode definir uma rota padrão se returnTo não estiver definido
    delete req.session.returnTo; // Limpe a URL de origem para evitar redirecionamentos indesejados

    const user = await connect.login(username, pass)
    req.session.user = user
    res.redirect(returnTo);
})

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao destruir a sessão:', err);
            return res.sendStatus(500); // ou redirecione para uma página de erro
        }

        // Redirecione para a página de login ou qualquer outra página após o logout
        res.redirect('/');
    });
})

app.get('/logged', checkLogin, async (req, res) => {
    const user = req.session.user[0]
    const listUsers = await connect.getUsersToList(user.name)
    res.render('app/chat', {
        user,
        listUsers
    })
})

app.get('/getUsers', async (req, res) => {
    const users = await connect.getUsers()
    res.json(users)
})

app.get('/getIndividualMessages', checkLogin, async (req, res) => {
    const { sender, recipient } = req.query
    const messages = await connect.getIndividualMessages(sender, recipient)
    res.json(messages)
})

app.get('/getGroupMessages', checkLogin, async (req, res) => {
    const { group } = req.query
    const messages = await connect.getGroupMessages(group)
    res.json(messages)
})

app.get('/profile', checkLogin, async (req, res) => {
    const profile = await connect.getProfile(req.session.user[0].name)
    res.render('app/profileEdit', {
        profile: profile
    })
})

app.post('/saveMessage', checkLogin, async (req, res) => {
    try {
        const { message, agentRoom } = req.body

        const sentMessage = {
            message: message,
            content_type: 'text',
            sentBy: req.session.user[0].name,
            createdAt: new Date(),
        }

        if (agentRoom.includes('individual')) {
            sentMessage.toUser = agentRoom.replace('-individual', '')
            await connect.saveIndividualMessage(message, sentMessage.content_type, sentMessage.sentBy, sentMessage.toUser)

        } else if (agentRoom.includes('group')) {
            sentMessage.groupName = agentRoom.replace('-group', '')
            await connect.saveGroupMessage(message, sentMessage.content_type, sentMessage.sentBy, sentMessage.groupName)
        }

        Emmiter.emit('message', sentMessage)

        res.status(200).json({ message: "Message saved successfully." });
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ error: "Internal server error." });
    }
});

app.post('/saveAttachment', checkLogin, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'doc', maxCount: 1 }
]), async (req, res) => {
    try {

        const filename = Object.values(req.files).flat().find(file => file !== undefined).filename;
        const agentRoom = req.body.agentRoom

        const sentMessage = {
            message: null,
            content_type: Object.values(req.files).flat().find(file => file !== undefined).fieldname,
            sentBy: req.session.user[0].name,
            createdAt: new Date(),
            path: filename,
            originalName: Object.values(req.files).flat().find(file => file !== undefined).originalname ? Object.values(req.files).flat().find(file => file !== undefined).originalname : null,
            mimetype: Object.values(req.files).flat().find(file => file !== undefined).mimetype,
        }

        if (agentRoom.includes('individual')) {
            sentMessage.toUser = agentRoom.replace('-individual', '')
            await connect.saveIndividualMessage(sentMessage.message, sentMessage.content_type, sentMessage.sentBy, sentMessage.toUser, sentMessage.path, sentMessage.originalName)

        } else if (agentRoom.includes('group')) {
            sentMessage.groupName = agentRoom.replace('-group', '')
            await connect.saveGroupMessage(sentMessage.message, sentMessage.content_type, sentMessage.sentBy, sentMessage.groupName, sentMessage.path, sentMessage.originalName)
        }

        Emmiter.emit('message', sentMessage)
        res.status(200).json({ message: "Message saved successfully." });
    } catch {
        console.error("Error saving message:", error);
        res.status(500).json({ error: "Internal server error." });
    }
})

app.post('/updateUser', checkLogin, upload.single('profilePicPath'), async (req, res) => {
    const ext = path.extname(req.file.originalname);
    const profilePicPath = req.session.user[0].name + ext
    console.log(profilePicPath)
    await connect.updateUser(profilePicPath, req.body.id)
    res.redirect('/logged')
})


module.exports = {
    serverHttp,
    io,
    Emmiter
}