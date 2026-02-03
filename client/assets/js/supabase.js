// Substitua pelas suas chaves REAIS do painel do Supabase
const SUPABASE_URL = 'https://prretozpncwoxbjzjsjl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dW7eUGJmMs8gOelUr8UGIQ_eAPI_6dc';

// Verificação de segurança para ver se a biblioteca carregou
if (typeof window.supabase === 'undefined') {
    console.error('A biblioteca do Supabase não foi carregada. Verifique o <script> no HTML.');
} else {
    // Cria o cliente e o anexa explicitamente à janela (window) com um nome ÚNICO
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('Supabase conectado!', window.supabaseClient);
}