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
    try {
        // 1. Busca os dados
        const { data: contrato, error } = await window.supabaseClient
            .from('contratos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // 2. Gera o Arquivo (Lógica do DocxTemplater)
        const response = await fetch('../assets/docs/modelo_contrato.docx');
        if (!response.ok) throw new Error("Modelo não encontrado");
        
        const content = await response.arrayBuffer();
        const zip = new PizZip(content);
        const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

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

        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        const nomeArquivo = `Contrato_${(contrato.razao_social || 'Sem_Nome').replace(/\s+/g, '_')}.docx`;
        saveAs(out, nomeArquivo);

        // 3. ATUALIZAÇÃO AUTOMÁTICA: Muda status para 'baixado' se ainda não for
        if (contrato.status === "novo") {
            await window.supabaseClient
                .from('contratos')
                .update({ status: 'baixado' })
                .eq('id', id);
            
            // Atualiza a tabela visualmente
            window.loadContratos();
        }

    } catch (error) {
        console.error("Erro ao gerar contrato:", error);
        alert("Erro: " + error.message);
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