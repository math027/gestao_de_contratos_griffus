document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se o Supabase carregou
    if (!window.supabaseClient) return;

    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- Verificação de Sessão ---
    const checkSession = async () => {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        const path = window.location.pathname;

        // Caso 1: Usuário logado tentando acessar a tela de login -> Manda pro Admin
        if (path.includes('login.html') && session) {
            window.location.href = 'admin/contratos.html';
            return;
        }

        // Caso 2: Usuário NÃO logado tentando acessar pasta /admin/ -> Manda pro Login
        // Verifica se está na pasta admin E não é a tela de login (caso existisse login dentro de admin)
        if (path.includes('/admin/') && !session) {
            // Ajusta o caminho de volta dependendo da profundidade (assumindo ../login.html)
            window.location.href = '../login.html';
        }
    };

    // Executa verificação ao carregar
    checkSession();

    // --- Lógica de Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('adminUser').value;
            const password = document.getElementById('adminPass').value;
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;

            try {
                btn.innerText = 'Entrando...';
                btn.disabled = true;

                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Sucesso: Redireciona
                window.location.href = 'admin/contratos.html';

            } catch (error) {
                alert('Erro de autenticação: ' + error.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // --- Lógica de Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const { error } = await window.supabaseClient.auth.signOut();
            if (!error) {
                window.location.href = '../login.html';
            }
        });
    }
});