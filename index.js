const express = require('express');
require('dotenv').config();
const port = process.env.PORT || 5000;
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send("Started Where Is It Server");
});

app.listen(port, (req, res) => {
    console.log('server started at Port: ', port);
})