const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Language school is running')
})






app.listen(port, ()=>{
    console.log(`global school is running on port: ${port}`)
})