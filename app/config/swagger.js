const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const adminOptions = {
    definition: {
        openapi: '3.0.0',

        info: {
            title: 'Car Travels',
            version: '1.0.0',
            description: 'Car Travels APIs',
        },
    },
    securityDefinitions: {
        bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            scheme: 'bearer',
            in: 'header',
        },
    },
    apis: ['./app/routes/*.js'],
};



function userOption(option) {

    spec = swaggerJsdoc(adminOptions);
    return swaggerUi.setup(spec);
}

module.exports = { userOption };

