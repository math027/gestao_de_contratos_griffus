document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('tbody');

    if (!window.supabaseClient) return;

    // --- Listagem Inicial ---
    async function loadContratos() {
        try {
            const { data: contratos, error } = await window.supabaseClient
                .from('contratos')
                .select('*') // Precisa de tudo para preencher o contrato
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
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum contrato encontrado.</td></tr>`;
            return;
        }

        data.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString('pt-BR');
            const statusClass = getStatusClass(c.status);

            const row = `
                <tr>
                    <td>#${c.id.slice(0, 8)}</td>
                    <td><strong>${c.razao_social || '-'}</strong><br><span style="font-size: 0.8em; color: #999;">${c.nome_socio || '-'}</span></td>
                    <td>Comercial</td>
                    <td>${date}</td>
                    <td><span class="status-badge ${statusClass}">${c.status || 'pendente'}</span></td>
                    <td>
                        <button onclick="verDetalhes('${c.id}')" class="btn-icon-only" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></button>
                        <button onclick="gerarContratoWord('${c.id}')" class="btn-icon-only" title="Gerar Contrato Word" style="color: #1976d2;">
                            <i class="fa-solid fa-file-word"></i>
                        </button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    function getStatusClass(status) {
        if (!status) return 'status-pending';
        if (['ativo', 'aprovado'].includes(status.toLowerCase())) return 'status-active';
        return 'status-inactive';
    }

    loadContratos();
});

// --- Função para Gerar o Word ---
window.gerarContratoWord = async (id) => {
    try {
        const { data: contrato, error } = await window.supabaseClient
            .from('contratos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // DEBUG: Veja no console (F12) se os dados estão chegando do banco
        console.log("Dados vindos do Banco:", contrato);

        const response = await fetch('../assets/docs/modelo_contrato.docx');
        if (!response.ok) throw new Error("Modelo não encontrado");
        
        const content = await response.arrayBuffer();
        const zip = new PizZip(content);
        const doc = new window.docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // AQUI ESTÁ A MÁGICA: O lado esquerdo (chave) é o que vai no Word.
        // O lado direito (valor) é o que vem do Banco de Dados.
        doc.render({
            // Empresa
            razaoSocial: contrato.razao_social || "EMPRESA NÃO INFORMADA",
            cnpj: contrato.cnpj || "-",
            // Montamos o endereço completo numa variável só para facilitar no Word
            enderecoEmpresa: `${contrato.endereco || ''}, ${contrato.numero || ''} - ${contrato.bairro || ''}`,
            cidadeEmpresa: contrato.cidade || "-",
            ufEmpresa: contrato.uf || "-",
            cepEmpresa: contrato.cep || "-",
            
            // Sócio
            nomeSocio: contrato.nome_socio || "SÓCIO NÃO INFORMADO",
            cpfSocio: contrato.cpf || "-",
            rgSocio: contrato.rg || "-",
            nacionalidadeSocio: contrato.nacionalidade || "Brasileiro",
            estadoCivilSocio: contrato.estado_civil || "-",
            profissaoSocio: contrato.profissao || "-",
            // Montamos o endereço do sócio
            enderecoSocio: `${contrato.endereco_socio || ''}, ${contrato.numero_socio || ''} - ${contrato.bairro_socio || ''}`,
            cidadeSocio: contrato.cidade_socio || "-",
            
            // Datas
            diaAtual: new Date().getDate(),
            mesAtual: new Date().toLocaleString('pt-BR', { month: 'long' }),
            anoAtual: new Date().getFullYear()
        });

        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const nomeArquivo = `Contrato_${(contrato.razao_social || 'Sem_Nome').replace(/\s+/g, '_')}.docx`;
        saveAs(out, nomeArquivo);

    } catch (error) {
        console.error("Erro ao gerar contrato:", error);
        alert("Erro: " + error.message);
    }
};

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