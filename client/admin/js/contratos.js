document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.querySelector('tbody');

    if (!window.supabaseClient) return;

    // Tornar loadContratos acessível globalmente para recarregar após ações
    window.loadContratos = async function() {
        try {
            const { data: contratos, error } = await window.supabaseClient
                .from('contratos')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            todosContratos = contratos;
            renderTable(todosContratos);
            
            aplicarFiltros(); 
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
            // Garante que o status esteja em minúsculo para comparação
            const rawStatus = (c.status || 'novo').toLowerCase();
            const statusClass = getStatusClass(rawStatus);

            const row = `
                <tr>
                    <td>#${c.id.slice(0, 8)}</td>
                    <td><strong>${c.razao_social || '-'}</strong><br><span style="font-size: 0.8em; color: #999;">${c.nome_socio || '-'}</span></td>
                    <td>Comercial</td>
                    <td>${date}</td>
                    <td><span class="status-badge ${statusClass}">${rawStatus}</span></td>
                    <td>
                        <button onclick="verDetalhes('${c.id}')" class="btn-icon-only" title="Ver Detalhes">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        
                        <button onclick="gerarContratoWord('${c.id}')" class="btn-icon-only" title="Baixar Word" style="color: #1976d2;">
                            <i class="fa-solid fa-file-word"></i>
                        </button>

                        <button onclick="abrirModalStatus('${c.id}', '${rawStatus}')" class="btn-icon-only" title="Editar Status" style="color: #f39c12;">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>

                        <button onclick="excluirContrato('${c.id}')" class="btn-icon-only" title="Excluir" style="color: #d32f2f;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            tableBody.innerHTML += row;
        });
    }

    function aplicarFiltros() {
        const termo = document.getElementById('inputBusca').value.toLowerCase();
        const statusFiltro = document.getElementById('filtroStatus').value;

        const filtrados = todosContratos.filter(c => {
            // Verifica o Status (se vazio, aceita todos)
            const statusMatch = statusFiltro === "" || (c.status || 'novo').toLowerCase() === statusFiltro;

            // Verifica Texto (Nome, Razão Social ou CNPJ)
            const razao = (c.razao_social || '').toLowerCase();
            const nome = (c.nome_socio || '').toLowerCase();
            const cnpj = (c.cnpj || '').toLowerCase(); // Pega CNPJ mesmo com pontos
            const searchMatch = razao.includes(termo) || nome.includes(termo) || cnpj.includes(termo);

            return statusMatch && searchMatch;
        });

        renderTable(filtrados);
    }

    const elBusca = document.getElementById('inputBusca');
    const elStatus = document.getElementById('filtroStatus');

    if (elBusca) elBusca.addEventListener('input', aplicarFiltros);
    if (elStatus) elStatus.addEventListener('change', aplicarFiltros);

    function getStatusClass(status) {
        switch (status) {
            case 'novo': return 'status-info';       // Azul ou neutro (Crie essa classe no CSS se precisar)
            case 'baixado': return 'status-active';  // Verde ou Roxo
            case 'assinado': return 'status-active'; // Verde
            case 'pendente': return 'status-pending';// Amarelo/Laranja
            case 'arquivado': return 'status-inactive'; // Cinza
            default: return 'status-pending';
        }
    }

    window.loadContratos();
});

// --- Função Excluir ---
window.excluirContrato = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este contrato? Essa ação não pode ser desfeita.")) return;

    try {
        const { error } = await window.supabaseClient
            .from('contratos')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        alert("Contrato excluído com sucesso!");
        window.loadContratos(); // Recarrega a tabela
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir contrato.");
    }
};

// --- Funções de Status (Editar Manualmente) ---
window.abrirModalStatus = (id, currentStatus) => {
    const modal = document.getElementById('modalStatus');
    document.getElementById('statusIdContrato').value = id;
    document.getElementById('novoStatus').value = currentStatus;
    modal.classList.add('active');
};

window.fecharModalStatus = () => {
    document.getElementById('modalStatus').classList.remove('active');
};

window.salvarStatus = async () => {
    const id = document.getElementById('statusIdContrato').value;
    const novoStatus = document.getElementById('novoStatus').value;
    const btnSalvar = document.querySelector('#modalStatus button.btn-griffus');

    btnSalvar.textContent = "Salvando...";
    btnSalvar.disabled = true;

    try {
        const { error } = await window.supabaseClient
            .from('contratos')
            .update({ status: novoStatus })
            .eq('id', id);

        if (error) throw error;

        window.fecharModalStatus();
        window.loadContratos();
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status.");
    } finally {
        btnSalvar.textContent = "Salvar Alteração";
        btnSalvar.disabled = false;
    }
};


// --- Função para Gerar o Word (Com Atualização Automática de Status) ---
window.gerarContratoWord = async (id) => {
    const btnIcon = document.querySelector(`button[onclick="gerarContratoWord('${id}')"] i`);
    const originalClass = btnIcon ? btnIcon.className : '';
    
    // Feedback visual de carregamento
    if (btnIcon) {
        btnIcon.className = "fa-solid fa-spinner fa-spin";
    }

    try {
        // 1. Busca os dados do contrato
        const { data: contrato, error } = await window.supabaseClient
            .from('contratos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // ---------------------------------------------------------
        // PARTE 1: GERAR O ARQUIVO WORD (Igual ao anterior)
        // ---------------------------------------------------------
        const response = await fetch('../assets/docs/modelo_contrato.docx');
        if (!response.ok) throw new Error("Modelo de contrato não encontrado");
        
        const content = await response.arrayBuffer();
        const zipWord = new PizZip(content);
        const doc = new window.docxtemplater(zipWord, { paragraphLoop: true, linebreaks: true });

        // Preenche os dados
        doc.render({
            razaoSocial: contrato.razao_social || "EMPRESA NÃO INFORMADA",
            cnpj: contrato.cnpj || "-",
            enderecoEmpresa: `${contrato.endereco || ''}, ${contrato.numero || ''} - ${contrato.bairro || ''}`,
            cidadeEmpresa: contrato.cidade || "-",
            ufEmpresa: contrato.uf || "-",
            cepEmpresa: contrato.cep || "-",
            nomeSocio: contrato.nome_socio || "SÓCIO NÃO INFORMADO",
            cpfSocio: contrato.cpf || "-",
            rgSocio: contrato.rg || "-",
            nacionalidadeSocio: contrato.nacionalidade || "Brasileiro",
            estadoCivilSocio: contrato.estado_civil || "-",
            profissaoSocio: contrato.profissao || "-",
            enderecoSocio: `${contrato.endereco_socio || ''}, ${contrato.numero_socio || ''} - ${contrato.bairro_socio || ''}`,
            cidadeSocio: contrato.cidade_socio || "-",
            diaAtual: new Date().getDate(),
            mesAtual: new Date().toLocaleString('pt-BR', { month: 'long' }),
            anoAtual: new Date().getFullYear()
        });

        const wordBlob = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // ---------------------------------------------------------
        // PARTE 2: CRIAR O ZIP FINAL E BAIXAR ANEXOS
        // ---------------------------------------------------------
        const zipFinal = new JSZip(); // Usa a nova biblioteca JSZip
        const nomeLimpo = (contrato.razao_social || 'Contrato').replace(/[^a-zA-Z0-9]/g, '_');
        
        // Adiciona o contrato Word na raiz do ZIP
        zipFinal.file(`Contrato_${nomeLimpo}.docx`, wordBlob);

        // Cria pasta para anexos
        const folderAnexos = zipFinal.folder("Documentos_Anexados");

        // Lista de documentos possíveis no banco
        const listaDocs = [
            { col: 'doc_contrato_social', nome: 'Contrato_Social' },
            { col: 'doc_cartao_cnpj', nome: 'Cartao_CNPJ' },
            { col: 'doc_end_empresa', nome: 'Endereco_Empresa' },
            { col: 'doc_core', nome: 'CORE' },
            { col: 'doc_cpf_socio', nome: 'CPF_Socio' },
            { col: 'doc_identidade_socio', nome: 'RG_Socio' },
            { col: 'doc_end_socio_comp', nome: 'Endereco_Socio' }
        ];

        // Processa downloads em paralelo
        const downloadPromises = listaDocs.map(async (item) => {
            const path = contrato[item.col];
            if (path) {
                try {
                    // Baixa o arquivo do Supabase Storage
                    const { data: blobAnexo, error: errDown } = await window.supabaseClient.storage
                        .from('documentos')
                        .download(path);

                    if (!errDown && blobAnexo) {
                        // Pega a extensão original do arquivo (pdf, jpg, png, etc)
                        const ext = path.split('.').pop();
                        folderAnexos.file(`${item.nome}.${ext}`, blobAnexo);
                    }
                } catch (e) {
                    console.warn(`Erro ao baixar ${item.nome}:`, e);
                }
            }
        });

        await Promise.all(downloadPromises);

        // ---------------------------------------------------------
        // PARTE 3: GERAR DOWNLOAD E ATUALIZAR STATUS
        // ---------------------------------------------------------
        
        // Gera o arquivo ZIP final
        const zipContent = await zipFinal.generateAsync({ type: "blob" });
        saveAs(zipContent, `${nomeLimpo}.zip`);

        // Atualiza status para baixado
        if (contrato.status !== 'baixado' && contrato.status !== 'assinado') {
            await window.supabaseClient
                .from('contratos')
                .update({ status: 'baixado' })
                .eq('id', id);
            
            window.loadContratos();
        }

    } catch (error) {
        console.error("Erro ao gerar pacote:", error);
        alert("Erro ao gerar o pacote de arquivos: " + error.message);
    } finally {
        // Restaura o ícone
        if (btnIcon) btnIcon.className = originalClass;
    }
};

// --- Funções do Modal de Detalhes (Mantidas Iguais, apenas referência) ---
window.verDetalhes = async (id) => {
    // ... (Mantenha o código original do verDetalhes aqui)
    // Para economizar espaço na resposta, assumi que você manterá o original
    // Mas certifique-se de que ele ainda exista!
    
    // Vou reinserir o código original do verDetalhes abaixo para garantir que nada quebre:
    const modal = document.getElementById('modalDetalhes');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

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

        const field = (label, value) => `
            <div class="info-group">
                <label>${label}</label>
                <span>${value || '-'}</span>
            </div>`;

        const docLink = (path, label) => {
            if (!path) return '';
            const url = window.supabaseClient.storage.from('documentos').getPublicUrl(path).data.publicUrl;
            return `
                <a href="${url}" target="_blank" class="doc-link">
                    <i class="fa-solid fa-file-pdf" style="color: #e91e63;"></i>
                    ${label}
                </a>`;
        };

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

document.getElementById('modalDetalhes').addEventListener('click', (e) => {
    if (e.target.id === 'modalDetalhes') window.fecharModal();
});