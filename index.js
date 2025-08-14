require('dotenv').config();
const express = require('express');
const db=require('./app/config/db');
const authRoutes = require('./app/routes/authRoutes');
const SessionMiddleware = require('./app/middleware/seessionMiddleware');
const path = require('path');


const swaggerUi = require('swagger-ui-express');
const { userOption } = require('./app/config/swagger');

const app= express();
const port= 3000;

db();


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'app/uploads')));

app.use(SessionMiddleware);




// Routes
app.use('/api/auth', authRoutes);

//swagger
app.use('/api-docs', swaggerUi.serve, (req, res) => {
    userOption(req.query.option)(req, res);
});

app.listen(port,()=>{
    console.log(`App running on port ${port}`);
})