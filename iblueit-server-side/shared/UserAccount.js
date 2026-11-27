const mongoose = require('mongoose');

const UserAccountSchema = mongoose.Schema({
    fullname: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    pacientId: { type: String },
    gameToken: {
        token: { type: String },
        description: { type: String },
        createdAt: { type: Date }
    },
    // Chave de API de IA própria do fisioterapeuta (opcional). `encrypted` é
    // AES-256-GCM (ver shared/llmKeyCrypto.js) e nunca é devolvido ao front;
    // `last4` serve só para exibir "••••a1b2" na tela de configuração.
    llmApiKey: {
        encrypted: { type: String },
        last4: { type: String },
        updatedAt: { type: Date }
    }
},
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_At' }, toJSON: { virtuals: true } }
);

module.exports = mongoose.model('UserAccount', UserAccountSchema);