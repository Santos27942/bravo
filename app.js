// ===== SISTEMA DE ABAS =====
function abrirAba(evt, nomeAba) {
    // Esconder todas as abas
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    // Remover classe active de todos os botões
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }

    // Mostrar aba atual
    document.getElementById(nomeAba).classList.add('active');
    evt.currentTarget.classList.add('active');

    // Parar câmeras ao trocar de aba
    pararTodasCameras();
}

function pararTodasCameras() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    if (webcamStreamTreino) {
        webcamStreamTreino.getTracks().forEach(track => track.stop());
        webcamStreamTreino = null;
    }
    
    // Resetar interface
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('btnCapturar').style.display = 'none';
    document.getElementById('btnPararCamera').style.display = 'none';
    document.getElementById('btnIniciarCamera').style.display = 'inline-block';
    
    document.getElementById('cameraContainerTreino').style.display = 'none';
    document.getElementById('btnPararCameraTreino').style.display = 'none';
    document.getElementById('btnIniciarCameraTreino').style.display = 'inline-block';
}

// Banco de dados local (localStorage)
let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let editandoId = null;

// Variáveis para reconhecimento de imagem
let model = null;
let webcamStream = null;
let webcamStreamTreino = null;
let isModelLoaded = false;
let classifier = null;
let produtosTreinados = JSON.parse(localStorage.getItem('produtosTreinados')) || {};

// Mapeamento de produtos (keywords da IA para produtos da padaria)
const produtoKeywords = {
    'bread': ['pão', 'bread', 'baguette', 'loaf'],
    'cake': ['bolo', 'cake', 'cupcake', 'muffin'],
    'cookie': ['biscoito', 'cookie', 'bolacha'],
    'croissant': ['croissant', 'croassã'],
    'doughnut': ['rosquinha', 'donut', 'doughnut', 'sonho'],
    'pizza': ['pizza', 'esfiha'],
    'pretzel': ['pretzel'],
    'bagel': ['bagel'],
    'sandwich': ['sanduíche', 'sandwich', 'salgado'],
    'coffee': ['café', 'coffee'],
    'milk': ['leite', 'milk'],
    'juice': ['suco', 'juice']
};

// Função para gerar código sugerido
function gerarCodigoSugerido() {
    const ultimoCodigo = produtos.length > 0 
        ? Math.max(...produtos.map(p => {
            const numero = parseInt(p.codigo.split('-')[1]);
            return isNaN(numero) ? 0 : numero;
        }))
        : 0;
    
    const novoCodigo = (ultimoCodigo + 1).toString().padStart(4, '0');
    return `PAD-${novoCodigo}`;
}

// Atualizar campo do código
function atualizarCodigoDisplay() {
    if (editandoId === null) {
        document.getElementById('codigoProduto').value = gerarCodigoSugerido();
    }
}

// Verificar se código já existe
function codigoJaExiste(codigo) {
    return produtos.some(p => p.codigo.toUpperCase() === codigo.toUpperCase() && p.codigo !== editandoId);
}

// Salvar no localStorage
function salvarProdutos() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    atualizarTabela();
    atualizarEstatisticas();
    atualizarSelectProdutos();
}

// Mostrar alerta
function mostrarAlerta(mensagem, tipo = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = `
        <div class="alert alert-${tipo}">
            ${mensagem}
        </div>
    `;
    
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 3000);
}

// Cadastrar/Editar produto
document.getElementById('produtoForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const codigoInput = document.getElementById('codigoProduto').value.trim();
    
    // Verificar se código já existe (exceto ao editar o mesmo produto)
    if (codigoJaExiste(codigoInput)) {
        mostrarAlerta('❌ Este código já está sendo usado por outro produto!', 'error');
        document.getElementById('codigoProduto').focus();
        return;
    }
    
    const produto = {
        codigo: codigoInput,
        nome: document.getElementById('nomeProduto').value,
        categoria: document.getElementById('categoria').value,
        preco: parseFloat(document.getElementById('preco').value),
        quantidade: parseInt(document.getElementById('quantidade').value),
        descricao: document.getElementById('descricao').value,
        dataCadastro: new Date().toLocaleString('pt-BR')
    };

    if (editandoId !== null) {
        // Editando produto existente
        const index = produtos.findIndex(p => p.codigo === editandoId);
        produtos[index] = produto;
        mostrarAlerta('✅ Produto atualizado com sucesso!');
        editandoId = null;
        document.getElementById('btnText').textContent = '💾 Cadastrar Produto';
        document.getElementById('btnCancelar').style.display = 'none';
    } else {
        // Novo produto
        produtos.push(produto);
        mostrarAlerta('✅ Produto cadastrado com sucesso!');
        
        // Vibração ao cadastrar (se disponível)
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    salvarProdutos();
    this.reset();
    atualizarCodigoDisplay();
});

// Cancelar edição
document.getElementById('btnCancelar').addEventListener('click', function() {
    editandoId = null;
    document.getElementById('produtoForm').reset();
    document.getElementById('btnText').textContent = 'Cadastrar Produto';
    this.style.display = 'none';
    atualizarCodigoDisplay();
});

// Editar produto
function editarProduto(codigo) {
    const produto = produtos.find(p => p.codigo === codigo);
    if (produto) {
        editandoId = codigo;
        document.getElementById('codigoProduto').value = produto.codigo;
        document.getElementById('nomeProduto').value = produto.nome;
        document.getElementById('categoria').value = produto.categoria;
        document.getElementById('preco').value = produto.preco;
        document.getElementById('quantidade').value = produto.quantidade;
        document.getElementById('descricao').value = produto.descricao;
        document.getElementById('btnText').textContent = '💾 Atualizar Produto';
        document.getElementById('btnCancelar').style.display = 'inline-block';
        
        // Mudar para aba de cadastro e scroll para o formulário
        document.querySelector('.tab').click();
        setTimeout(() => {
            document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
}

// Deletar produto
function deletarProduto(codigo) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        produtos = produtos.filter(p => p.codigo !== codigo);
        salvarProdutos();
        mostrarAlerta('🗑️ Produto excluído com sucesso!');
        
        // Vibração ao deletar (se disponível)
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
    }
}

// Atualizar lista de produtos
function atualizarTabela(filtro = '') {
    const container = document.getElementById('produtosContainer');
    
    const produtosFiltrados = produtos.filter(p => {
        const termo = filtro.toLowerCase();
        return p.codigo.toLowerCase().includes(termo) ||
               p.nome.toLowerCase().includes(termo) ||
               p.categoria.toLowerCase().includes(termo);
    });

    if (produtosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3>${filtro ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}</h3>
                <p>${filtro ? 'Tente outro termo de busca' : 'Adicione seu primeiro produto'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = produtosFiltrados.map(produto => `
        <div class="product-card">
            <div class="product-header">
                <span class="product-code">${produto.codigo}</span>
                <span style="color: #757575; font-size: 0.85em;">📦 ${produto.categoria}</span>
            </div>
            <div class="product-name">${produto.nome}</div>
            <div class="product-info">
                <span><strong>R$ ${produto.preco.toFixed(2)}</strong></span>
                <span>Estoque: <strong>${produto.quantidade}</strong></span>
            </div>
            ${produto.descricao ? `<p style="color: #757575; font-size: 0.85em; margin-bottom: 8px;">${produto.descricao}</p>` : ''}
            <div class="product-actions">
                <button class="btn btn-edit" onclick="editarProduto('${produto.codigo}')" style="flex: 1;">✏️ Editar</button>
                <button class="btn btn-delete" onclick="deletarProduto('${produto.codigo}')" style="flex: 1;">🗑️ Excluir</button>
            </div>
        </div>
    `).join('');
}

// Atualizar estatísticas
function atualizarEstatisticas() {
    document.getElementById('totalProdutos').textContent = produtos.length;
    
    const valorTotal = produtos.reduce((sum, p) => sum + (p.preco * p.quantidade), 0);
    document.getElementById('valorTotal').textContent = `R$ ${valorTotal.toFixed(2)}`;
    
    const estoqueTotal = produtos.reduce((sum, p) => sum + p.quantidade, 0);
    document.getElementById('estoqueTotal').textContent = estoqueTotal;
}

// Busca de produtos
document.getElementById('searchInput').addEventListener('input', function(e) {
    atualizarTabela(e.target.value);
});

// ===== RECONHECIMENTO DE IMAGEM =====

// Carregar modelo MobileNet e Classifier
async function carregarModelo() {
    if (isModelLoaded) return;
    
    try {
        document.getElementById('loadingModel').style.display = 'block';
        model = await mobilenet.load();
        classifier = knnClassifier.create();
        
        // Carregar treino salvo
        await carregarTreinoSalvo();
        
        isModelLoaded = true;
        document.getElementById('loadingModel').style.display = 'none';
        console.log('Modelo carregado com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        document.getElementById('loadingModel').innerHTML = '<p style="color: #f44336;">❌ Erro ao carregar modelo de IA</p>';
    }
}

// Carregar treino salvo do localStorage
async function carregarTreinoSalvo() {
    const treinoSalvo = localStorage.getItem('classificadorTreino');
    if (treinoSalvo && classifier) {
        try {
            classifier.setClassifierDataset(
                Object.fromEntries(
                    JSON.parse(treinoSalvo).map(([label, data, shape]) => [
                        label,
                        tf.tensor(data, shape)
                    ])
                )
            );
            console.log('Treino anterior carregado!');
        } catch (error) {
            console.error('Erro ao carregar treino:', error);
        }
    }
}

// Salvar treino no localStorage
function salvarTreino() {
    if (classifier) {
        const dataset = classifier.getClassifierDataset();
        const datasetObj = Object.entries(dataset).map(([label, data]) => [
            label,
            Array.from(data.dataSync()),
            data.shape
        ]);
        localStorage.setItem('classificadorTreino', JSON.stringify(datasetObj));
        localStorage.setItem('produtosTreinados', JSON.stringify(produtosTreinados));
    }
}

// Atualizar lista de produtos no select
function atualizarSelectProdutos() {
    const select = document.getElementById('selectProdutoTreino');
    select.innerHTML = '<option value="">Selecione um produto para treinar...</option>';
    
    produtos.forEach(p => {
        const option = document.createElement('option');
        option.value = p.codigo;
        option.textContent = `${p.codigo} - ${p.nome}`;
        select.appendChild(option);
    });
    
    atualizarListaTreino();
}

// Habilitar/desabilitar botão de treino
document.getElementById('selectProdutoTreino').addEventListener('change', function() {
    document.getElementById('btnAdicionarAmostra').disabled = !this.value;
});

// Adicionar amostra de treinamento
document.getElementById('btnAdicionarAmostra').addEventListener('click', async function() {
    if (!isModelLoaded || !webcamStreamTreino) {
        alert('⚠️ Inicie a câmera primeiro!');
        return;
    }

    const codigoProduto = document.getElementById('selectProdutoTreino').value;
    if (!codigoProduto) return;

    const video = document.getElementById('webcamTreino');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Capturar frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
        // Obter features da imagem
        const activation = model.infer(canvas, 'conv_preds');
        
        // Adicionar ao classificador
        classifier.addExample(activation, codigoProduto);
        activation.dispose();

        // Atualizar contagem
        if (!produtosTreinados[codigoProduto]) {
            produtosTreinados[codigoProduto] = 0;
        }
        produtosTreinados[codigoProduto]++;

        // Salvar treino
        salvarTreino();
        atualizarListaTreino();

        // Feedback visual
        document.getElementById('trainingStatus').innerHTML = `
            <div class="training-status">
                ✅ Amostra adicionada! Total: ${produtosTreinados[codigoProduto]} imagens
            </div>
        `;

        setTimeout(() => {
            document.getElementById('trainingStatus').innerHTML = '';
        }, 2000);

        // Vibração
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    } catch (error) {
        console.error('Erro ao adicionar amostra:', error);
        alert('❌ Erro ao adicionar amostra');
    }
});

// Limpar treinamento
document.getElementById('btnLimparTreino').addEventListener('click', function() {
    if (confirm('Tem certeza que deseja limpar todo o treinamento?')) {
        if (classifier) {
            classifier.clearAllClasses();
        }
        produtosTreinados = {};
        localStorage.removeItem('classificadorTreino');
        localStorage.removeItem('produtosTreinados');
        atualizarListaTreino();
        alert('🗑️ Treinamento limpo!');
    }
});

// Atualizar lista de treino
function atualizarListaTreino() {
    const listDiv = document.getElementById('trainingList');
    
    if (Object.keys(produtosTreinados).length === 0) {
        listDiv.innerHTML = '';
        return;
    }

    let html = '<div style="margin-top: 12px;">';
    html += '<p style="font-size: 0.85em; color: #666; margin-bottom: 8px;"><strong>Produtos treinados:</strong></p>';
    
    for (const [codigo, count] of Object.entries(produtosTreinados)) {
        const produto = produtos.find(p => p.codigo === codigo);
        const nome = produto ? produto.nome : codigo;
        
        html += `
            <div class="training-item">
                <div class="info">
                    <strong>${codigo}</strong><br>
                    <small style="color: #666;">${nome}</small>
                </div>
                <span class="count">${count} 📸</span>
            </div>
        `;
    }
    html += '</div>';
    
    listDiv.innerHTML = html;
}

// ===== CÂMERA PARA TREINAMENTO =====
document.getElementById('btnIniciarCameraTreino').addEventListener('click', async function() {
    try {
        const video = document.getElementById('webcamTreino');
        
        webcamStreamTreino = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }
        });
        
        video.srcObject = webcamStreamTreino;
        document.getElementById('cameraContainerTreino').style.display = 'block';
        document.getElementById('btnPararCameraTreino').style.display = 'inline-block';
        this.style.display = 'none';
        
        if (!isModelLoaded) {
            document.getElementById('loadingModelTreino').style.display = 'block';
            await carregarModelo();
            document.getElementById('loadingModelTreino').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        alert('❌ Não foi possível acessar a câmera.');
    }
});

document.getElementById('btnPararCameraTreino').addEventListener('click', function() {
    if (webcamStreamTreino) {
        webcamStreamTreino.getTracks().forEach(track => track.stop());
        webcamStreamTreino = null;
    }
    
    document.getElementById('cameraContainerTreino').style.display = 'none';
    this.style.display = 'none';
    document.getElementById('btnIniciarCameraTreino').style.display = 'inline-block';
});

// ===== CÂMERA PARA RECONHECIMENTO =====
document.getElementById('btnIniciarCamera').addEventListener('click', async function() {
    try {
        const video = document.getElementById('webcam');
        
        // Solicitar acesso à câmera
        webcamStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Câmera traseira em dispositivos móveis
        });
        
        video.srcObject = webcamStream;
        document.getElementById('cameraContainer').style.display = 'block';
        document.getElementById('btnCapturar').style.display = 'inline-block';
        document.getElementById('btnPararCamera').style.display = 'inline-block';
        this.style.display = 'none';
        
        // Carregar modelo se ainda não foi carregado
        if (!isModelLoaded) {
            await carregarModelo();
        }
    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        alert('❌ Não foi possível acessar a câmera. Verifique as permissões.');
    }
});

// Parar câmera
document.getElementById('btnPararCamera').addEventListener('click', function() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
    
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('btnCapturar').style.display = 'none';
    this.style.display = 'none';
    document.getElementById('btnIniciarCamera').style.display = 'inline-block';
    document.getElementById('recognitionResult').innerHTML = '';
});

// Capturar e reconhecer imagem
document.getElementById('btnCapturar').addEventListener('click', async function() {
    if (!isModelLoaded) {
        alert('⏳ Aguarde o modelo ser carregado...');
        return;
    }

    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Configurar canvas com dimensões do vídeo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturar frame do vídeo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Mostrar loading
    document.getElementById('recognitionResult').innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Analisando imagem...</p>
        </div>
    `;

    try {
        // Verificar se há modelo treinado
        const numClasses = classifier.getNumClasses();
        
        if (numClasses > 0) {
            // Usar modelo personalizado
            const activation = model.infer(canvas, 'conv_preds');
            const result = await classifier.predictClass(activation);
            activation.dispose();
            
            mostrarResultadoPersonalizado(result);
        } else {
            // Usar MobileNet padrão
            const predictions = await model.classify(canvas);
            mostrarResultados(predictions);
        }
        
        // Vibração de feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
    } catch (error) {
        console.error('Erro ao classificar imagem:', error);
        document.getElementById('recognitionResult').innerHTML = `
            <div class="no-match">
                ❌ Erro ao processar imagem. Tente novamente.
            </div>
        `;
    }
});

// Mostrar resultado do modelo personalizado
function mostrarResultadoPersonalizado(result) {
    const resultDiv = document.getElementById('recognitionResult');
    const codigoProduto = result.label;
    const confianca = (result.confidences[codigoProduto] * 100).toFixed(1);
    
    const produto = produtos.find(p => p.codigo === codigoProduto);
    
    if (produto) {
        let html = '<div class="recognition-result">';
        html += '<h4>🎯 Reconhecimento Personalizado</h4>';
        html += `<p style="color: #4CAF50; font-weight: 500;">Confiança: ${confianca}%</p>`;
        html += '</div>';
        
        html += `
            <div class="product-match">
                <h4>✅ Produto Identificado!</h4>
                <p><strong>Código:</strong> ${produto.codigo}</p>
                <p><strong>Nome:</strong> ${produto.nome}</p>
                <p><strong>Categoria:</strong> ${produto.categoria}</p>
                <p><strong>Preço:</strong> R$ ${produto.preco.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${produto.quantidade} unidades</p>
                ${produto.descricao ? `<p style="margin-top: 8px; font-size: 0.9em; color: #666;">${produto.descricao}</p>` : ''}
            </div>
        `;
        
        resultDiv.innerHTML = html;
    } else {
        resultDiv.innerHTML = `
            <div class="no-match">
                ⚠️ Produto reconhecido mas não encontrado no cadastro.
                <br><small>Código detectado: ${codigoProduto}</small>
            </div>
        `;
    }
}

// Mostrar resultados do reconhecimento
function mostrarResultados(predictions) {
    const resultDiv = document.getElementById('recognitionResult');
    
    // Mostrar top 3 predições
    let html = '<div class="recognition-result">';
    html += '<h4>🤖 Reconhecimento de IA:</h4>';
    
    predictions.slice(0, 3).forEach((pred, index) => {
        const confidence = (pred.probability * 100).toFixed(1);
        html += `
            <div class="prediction-item">
                <span>${index + 1}. ${pred.className}</span>
                <span class="confidence">${confidence}%</span>
            </div>
        `;
    });
    html += '</div>';

    // Buscar produto correspondente
    const produtoEncontrado = buscarProdutoCorrespondente(predictions);
    
    if (produtoEncontrado) {
        html += `
            <div class="product-match">
                <h4>✅ Produto Encontrado!</h4>
                <p><strong>Código:</strong> ${produtoEncontrado.codigo}</p>
                <p><strong>Nome:</strong> ${produtoEncontrado.nome}</p>
                <p><strong>Categoria:</strong> ${produtoEncontrado.categoria}</p>
                <p><strong>Preço:</strong> R$ ${produtoEncontrado.preco.toFixed(2)}</p>
                <p><strong>Estoque:</strong> ${produtoEncontrado.quantidade} unidades</p>
            </div>
        `;
    } else {
        html += `
            <div class="no-match">
                ⚠️ Nenhum produto correspondente encontrado no cadastro.
                <br><small>Tente cadastrar este produto primeiro!</small>
            </div>
        `;
    }

    resultDiv.innerHTML = html;
}

// Buscar produto correspondente baseado nas predições
function buscarProdutoCorrespondente(predictions) {
    // Procurar em cada predição (começando pela mais confiante)
    for (const pred of predictions) {
        const className = pred.className.toLowerCase();
        
        // Verificar cada categoria de produto
        for (const [categoria, keywords] of Object.entries(produtoKeywords)) {
            // Verificar se alguma keyword está presente na predição
            if (keywords.some(keyword => className.includes(keyword.toLowerCase()))) {
                // Buscar produto com essa categoria ou nome similar
                const produto = produtos.find(p => {
                    const nomeLower = p.nome.toLowerCase();
                    const categoriaLower = p.categoria.toLowerCase();
                    return keywords.some(k => 
                        nomeLower.includes(k.toLowerCase()) || 
                        categoriaLower.includes(categoria)
                    );
                });
                
                if (produto) return produto;
            }
        }
        
        // Busca direta por nome do produto
        const produtoDireto = produtos.find(p => {
            const nomeLower = p.nome.toLowerCase();
            return className.includes(nomeLower) || nomeLower.includes(className);
        });
        
        if (produtoDireto) return produtoDireto;
    }
    
    return null;
}

// Inicializar
atualizarCodigoDisplay();
atualizarTabela();
atualizarEstatisticas();
atualizarSelectProdutos();
