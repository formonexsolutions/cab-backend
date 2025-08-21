require('dotenv').config();
const express = require('express');
const db=require('./app/config/db');
const authRoutes = require('./app/routes/authRoutes');
const userRoutes = require('./app/routes/userRoutes');
const SessionMiddleware = require('./app/middleware/seessionMiddleware');
const path = require('path');
const cors=require('cors')
const http=require('http');
const passengerRoutes= require('./app/routes/passenger.routes.js');
const driverRoutes= require('./app/routes/driver.routes.js');
const adminRoutes= require('./app/routes/admin.routes.js');
const paymentRoutes= require('./app/routes/payment.routes.js');

// const { notFound, errorHandler }= require('./app/middleware/errorMiddleware.js');


const swaggerUi = require('swagger-ui-express');
const { userOption } = require('./app/config/swagger');
const { initSocket } = require('./app/config/socket.js');


const app= express();
const port= 3000;


const server = http.createServer(app);
initSocket(server);
db();

app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'app/uploads')));

app.use(SessionMiddleware);



app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/passenger', passengerRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);
//swagger
app.use('/api-docs', swaggerUi.serve, (req, res) => {
    userOption(req.query.option)(req, res);
});

server.listen(port,()=>{
    console.log(`App running on port ${port}`);
})