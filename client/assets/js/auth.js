document.addEventListener('DOMContentLoaded', async () => {
    if (!window.supabaseClient) return;

    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Verifica sessão atual
    const checkSession = async () => {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        // Se já estiver logado e tentar acessar login, manda pro admin
        if (window.location.pathname.includes('login.html') && session) {
            window.location.href = 'admin/index.html';
        }

        // Se estiver no admin sem logar, manda pro login
        // (Verifica se está na pasta /admin/ mas não é a tela de login.html)
        if (window.location.pathname.includes('/admin/') && !window.location.pathname.includes('login.html') && !session) {
             // Comente essa linha se estiver testando localmente sem usuario criado ainda
             // window.location.href = '../login.html';
             console.log("Usuário não logado (Redirecionamento pausado para testes)");
        }
    };

    checkSession();

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('adminUser').value; 
            const password = document.getElementById('adminPass').value;

            const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert('Erro ao entrar: ' + error.message);
            } else {
                window.location.href = 'admin/index.html';
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.href = '../login.html';
        });
    }
});