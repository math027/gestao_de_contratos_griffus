document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formContratos');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            try {
                // Estado de carregamento
                submitBtn.innerText = 'Enviando...';
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.7';

                const formData = new FormData(form);
                
                // Mapeamento MANUAL dos campos HTML (camelCase) para Banco de Dados (snake_case)
                // Isso garante que os dados cheguem nas colunas certas do SQL que criamos
                const dbData = {
                    razao_social: formData.get('razaoSocial'),
                    cnpj: formData.get('cnpj'),
                    cep: formData.get('cep'),
                    endereco: formData.get('endereco'),
                    numero: formData.get('numero'),
                    bairro: formData.get('bairro'),
                    cidade: formData.get('cidade'),
                    uf: formData.get('uf'),
                    telefone: formData.get('telefone'),
                    celular: formData.get('celular'),
                    email_empresa: formData.get('emailEmpresa'),

                    banco: formData.get('banco'),
                    agencia: formData.get('agencia'),
                    conta: formData.get('conta'),
                    pix: formData.get('pix'),

                    nome_socio: formData.get('nomeSocio'),
                    cpf: formData.get('cpf'),
                    rg: formData.get('rg'),
                    orgao_expedidor: formData.get('orgaoExpedidor'),
                    nascimento: formData.get('nascimento'),
                    nacionalidade: formData.get('nacionalidade'),
                    estado_civil: formData.get('estadoCivil'),
                    profissao: formData.get('profissao'),
                    email_socio: formData.get('emailSocio'),

                    cep_socio: formData.get('cepSocio'),
                    endereco_socio: formData.get('enderecoSocio'),
                    numero_socio: formData.get('numeroSocio'),
                    bairro_socio: formData.get('bairroSocio'),
                    cidade_socio: formData.get('cidadeSocio'),
                    uf_socio: formData.get('ufSocio'),
                    
                    status: 'pendente' // Status inicial padrão
                };

                // Lista de campos de arquivos (IDs do HTML)
                const fileFields = [
                    'docContratoSocial', 
                    'docEndEmpresa', 
                    'docCartaoCnpj', 
                    'docCore', 
                    'docCpfSocio', 
                    'docIdentidadeSocio', 
                    'docEndSocioComp'
                ];

                // Limpar CNPJ para usar como nome da pasta (apenas números)
                const cnpjPasta = dbData.cnpj.replace(/\D/g, ''); 
                if (!cnpjPasta) throw new Error("CNPJ é obrigatório para organizar os arquivos.");

                // Loop de Upload de Arquivos
                for (const fieldId of fileFields) {
                    const fileInput = document.getElementById(fieldId);
                    
                    if (fileInput && fileInput.files.length > 0) {
                        const file = fileInput.files[0];
                        // Cria nome único: CNPJ/nome_campo.extensao
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${cnpjPasta}/${fieldId}.${fileExt}`;

                        // Upload para o Bucket 'documentos'
                        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
                            .from('documentos')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: true // Substitui se já existir
                            });

                        if (uploadError) {
                            console.error(`Erro ao subir ${fieldId}:`, uploadError);
                            throw new Error(`Falha no upload do documento: ${fieldId}`);
                        }

                        // Converte nome do campo HTML (docContratoSocial) para coluna do BD (doc_contrato_social)
                        // Ex: docContratoSocial -> doc_contrato_social
                        const dbColumn = fieldId.replace(/([A-Z])/g, "_$1").toLowerCase();
                        
                        // Salva o caminho do arquivo no objeto que vai pro banco
                        dbData[dbColumn] = uploadData.path;
                    }
                }

                // Inserir dados na tabela 'contratos'
                const { error: insertError } = await window.supabaseClient
                    .from('contratos')
                    .insert([dbData]);

                if (insertError) throw insertError;

                // Sucesso
                alert('Cadastro enviado com sucesso! Aguarde nosso contato.');
                form.reset();
                
                // Reseta nomes de arquivos no visual
                document.querySelectorAll('.file-name-display').forEach(span => {
                    span.textContent = 'Nenhum arquivo selecionado';
                });

                // Opcional: Redirecionar para home
                // window.location.href = 'index.html';

            } catch (error) {
                console.error('Erro no envio:', error);
                alert('Ocorreu um erro ao enviar o cadastro: ' + error.message);
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
        });
    }
});