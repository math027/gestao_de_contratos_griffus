document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('tbody');

    if (!window.supabaseClient) return;

    // --- Listagem Inicial ---
    async function loadContratos() {
        try {
            const { data: contratos, error } = await window.supabaseClient
                .from('contratos')
                .select('id, razao_social, nome_socio, created_at, status, doc_contrato_social')
                .order('created_at', { ascending: false });

            if (error) throw error;
            renderTable(contratos);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">Nenhum contrato encontrado.</td></tr>`;
            return;
        }

        data.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString('pt-BR');
            const statusClass = getStatusClass(c.status);
            // Gera URL pública para o download rápido na tabela
            const docUrl = c.doc_contrato_social 
                ? window.supabaseClient.storage.from('documentos').getPublicUrl(c.doc_contrato_social).data.publicUrl 
                : '#';

            const row = `
                <tr>
                    <td>#${c.id.slice(0, 8)}</td>
                    <td><strong>${c.razao_social || '-'}</strong><br><span style="font-size: 0.8em; color: #999;">${c.nome_socio || '-'}</span></td>
                    <td>Comercial</td>
                    <td>${date}</td>
                    <td><span class="status-badge ${statusClass}">${c.status || 'pendente'}</span></td>
                    <td>
                        <button onclick="verDetalhes('${c.id}')" class="btn-icon-only" title="Ver Tudo"><i class="fa-solid fa-eye"></i></button>
                        <a href="${docUrl}" target="_blank" class="btn-icon-only" title="Contrato Social"><i class="fa-solid fa-download"></i></a>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    function getStatusClass(status) {
        if (!status) return 'status-pending';
        if (['ativo', 'aprovado'].includes(status.toLowerCase())) return 'status-active';
        if (['rejeitado', 'inativo'].includes(status.toLowerCase())) return 'status-inactive';
        return 'status-pending';
    }

    loadContratos();
});

// --- Funções do Modal (Globais) ---

window.verDetalhes = async (id) => {
    const modal = document.getElementById('modalDetalhes');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    // Abre o modal com loading
    modal.classList.add('active');
    modalBody.innerHTML = '<p style="text-align: center; grid-column: span 2; padding: 20px;">Carregando dados...</p>';
    modalTitle.innerText = `Contrato #${id.slice(0,8)}`;

    try {
        const { data, error } = await window.supabaseClient
            .from('contratos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Função auxiliar para criar campos
        const field = (label, value) => `
            <div class="info-group">
                <label>${label}</label>
                <span>${value || '-'}</span>
            </div>`;

        // Função para gerar links de documentos
        const docLink = (path, label) => {
            if (!path) return '';
            const url = window.supabaseClient.storage.from('documentos').getPublicUrl(path).data.publicUrl;
            return `
                <a href="${url}" target="_blank" class="doc-link">
                    <i class="fa-solid fa-file-pdf" style="color: #e91e63;"></i>
                    ${label}
                </a>`;
        };

        // Monta o HTML detalhado
        modalBody.innerHTML = `
            <div class="section-title">Dados da Empresa</div>
            ${field('Razão Social', data.razao_social)}
            ${field('CNPJ', data.cnpj)}
            ${field('Email Corporativo', data.email_empresa)}
            ${field('Telefone', data.telefone)}
            ${field('Celular', data.celular)}
            ${field('Endereço', `${data.endereco}, ${data.numero} - ${data.bairro}`)}
            ${field('Cidade/UF', `${data.cidade}/${data.uf}`)}
            ${field('CEP', data.cep)}

            <div class="section-title">Dados Bancários</div>
            ${field('Banco', data.banco)}
            ${field('Agência', data.agencia)}
            ${field('Conta', data.conta)}
            ${field('Chave PIX', data.pix)}

            <div class="section-title">Dados do Sócio</div>
            ${field('Nome Completo', data.nome_socio)}
            ${field('CPF', data.cpf)}
            ${field('RG', `${data.rg} / ${data.orgao_expedidor}`)}
            ${field('Nascimento', new Date(data.nascimento).toLocaleDateString('pt-BR'))}
            ${field('Nacionalidade', data.nacionalidade)}
            ${field('Estado Civil', data.estado_civil)}
            ${field('Profissão', data.profissao)}
            ${field('Email Pessoal', data.email_socio)}
            ${field('Endereço Sócio', `${data.endereco_socio}, ${data.numero_socio} - ${data.bairro_socio}`)}
            ${field('Cidade/UF', `${data.cidade_socio}/${data.uf_socio}`)}

            <div class="section-title">Documentos Anexados</div>
            <div class="docs-grid">
                ${docLink(data.doc_contrato_social, 'Contrato Social')}
                ${docLink(data.doc_cartao_cnpj, 'Cartão CNPJ')}
                ${docLink(data.doc_end_empresa, 'Endereço Empresa')}
                ${docLink(data.doc_core, 'CORE')}
                ${docLink(data.doc_cpf_socio, 'CPF Sócio')}
                ${docLink(data.doc_identidade_socio, 'RG Sócio')}
                ${docLink(data.doc_end_socio_comp, 'Endereço Sócio')}
            </div>
        `;

    } catch (error) {
        console.error(error);
        modalBody.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar detalhes: ${error.message}</p>`;
    }
};

window.fecharModal = () => {
    document.getElementById('modalDetalhes').classList.remove('active');
};

// Fechar ao clicar fora
document.getElementById('modalDetalhes').addEventListener('click', (e) => {
    if (e.target.id === 'modalDetalhes') window.fecharModal();
});