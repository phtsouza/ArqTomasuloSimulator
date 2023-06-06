import { instrucoes } from "./instrucoes";

class Config {
    constructor() {
        this.numInstrucoes = 6
        this.ciclos = { Add: "1", Desvio: "1", Div: "15", Load: "2", Mult: "1", Store: "2" }
        this.unidades = { Add: "3", Desvio: "2", Mult: "2" }
        this.unidadesMem = { Load: "2", Store: "3" }
    }
}

class ReorderBuffer {
    estadoInstrucoes = []
    constructor(numInstrucoes) {
        for (let i = 0; i < numInstrucoes; i++) {
            let linha = {};
            linha['instrucao'] = {
                operacao: instrucoes[i]['nome'],
                registradorR: instrucoes[i]['r'],
                registradorS: instrucoes[i]['s'],
                registradorT: instrucoes[i]['t'],
            };

            linha['posicao'] = i;
            linha['issue'] = null;
            linha['exeCompleta'] = null;
            linha['write'] = null;
            linha['busy'] = false;
            this.estadoInstrucoes[i] = linha;
        }
    }
}

class ReservationStation {
    unidadesFuncionais = {}
    constructor(CONFIG) {
        for (var tipoUnidade in CONFIG['unidades']) {
            for (let i = 0; i < CONFIG['unidades'][tipoUnidade]; i++) {
                let unidadeFuncional = {};
                unidadeFuncional['instrucao'] = null;
                unidadeFuncional['estadoInstrucao'] = null;
                unidadeFuncional['tipoUnidade'] = tipoUnidade;
                unidadeFuncional['tempo'] = null;

                let nome = tipoUnidade + (i + 1);
                unidadeFuncional['nome'] = nome;
                unidadeFuncional['ocupado'] = false;

                unidadeFuncional['operacao'] = null;
                unidadeFuncional['vj'] = null;
                unidadeFuncional['vk'] = null;
                unidadeFuncional['qj'] = null;
                unidadeFuncional['qk'] = null;
                unidadeFuncional['destino'] = null;
                unidadeFuncional['posicao'] = null;

                this.unidadesFuncionais[nome] = unidadeFuncional;
            }
        }
    }
}

class MemoryReservationStation {
    unidadesFuncionaisMemoria = {};
    constructor(CONFIG) {
        for (var tipoUnidade in CONFIG['unidadesMem']) {
            for (let i = 0; i < CONFIG['unidadesMem'][tipoUnidade]; i++) {
                let unidadeFuncionalMemoria = {};
                unidadeFuncionalMemoria['instrucao'] = null;
                unidadeFuncionalMemoria['estadoInstrucao'] = null;
                unidadeFuncionalMemoria['tipoUnidade'] = tipoUnidade;
                unidadeFuncionalMemoria['tempo'] = null;

                let nome = tipoUnidade + (i + 1);
                unidadeFuncionalMemoria['nome'] = nome;
                unidadeFuncionalMemoria['ocupado'] = false;
                unidadeFuncionalMemoria['qi'] = null;
                unidadeFuncionalMemoria['qj'] = null;

                unidadeFuncionalMemoria['operacao'] = null;
                unidadeFuncionalMemoria['endereco'] = null;
                unidadeFuncionalMemoria['destino'] = null;
                unidadeFuncionalMemoria['posicao'] = null;

                this.unidadesFuncionaisMemoria[nome] =
                    unidadeFuncionalMemoria;
            }
        }
    }
}

let clock = 0

let estacaoRegistradores = {};

for (let i = 0; i < 32; i += 2) {
    estacaoRegistradores['F' + i] = null;
}

for (let i = 0; i < 32; i += 1) {
    estacaoRegistradores['R' + i] = null;
}

function getNovaInstrucao() {
    for (let i = 0; i < reorderBuffer.estadoInstrucoes.length; i++) {
        const element = reorderBuffer.estadoInstrucoes[i];
        if (element.issue == null) return element;
    }
    return undefined;
}

function verificaUFInstrucao(instrucao) {
    switch (instrucao.operacao) {
        case 'ADD':
            return 'Add';
        case 'SUB':
            return 'Add';
        case 'MUL':
            return 'Mult';
        case 'DIV':
            return 'Mult';
        case 'LD':
            return 'Load';
        case 'SW':
            return 'Store';
        case 'ADDI':
            return 'Add';
        case 'BEQ':
            return 'Desvio';
        case 'BNE':
            return 'Desvio';
    }
}

function getUFVazia(tipoUF) {
    if (tipoUF === 'Load' || tipoUF === 'Store') {
        for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
            var ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

            if (ufMem.tipoUnidade === tipoUF) {
                if (!ufMem.ocupado) {
                    return ufMem;
                }
            }
        }
        return undefined;
    }
    for (let key in reservationStation.unidadesFuncionais) {
        var uf = reservationStation.unidadesFuncionais[key];

        if (uf.tipoUnidade === tipoUF) {
            if (!uf.ocupado) {
                return uf;
            }
        }
    }
    return undefined;
}

function getCiclos(instrucao) {
    switch (instrucao.operacao) {
        case 'ADD':
            return parseInt(config.ciclos['Add']);
        case 'SUB':
            return parseInt(config.ciclos['Add']);
        case 'MUL':
            return parseInt(config.ciclos['Mult']);
        case 'DIV':
            return parseInt(config.ciclos['Mult']);
        case 'LD':
            return parseInt(config.ciclos['Load']);
        case 'SW':
            return parseInt(config.ciclos['Store']);
        case 'ADDI':
            return parseInt(config.ciclos['Add']);
        case 'BEQ':
            return parseInt(config.ciclos['Desvio']);
        case 'BNE':
            return parseInt(config.ciclos['Desvio']);
    }
}

function alocaUfMem(uf, instrucao, estadoInstrucao) {
    uf.instrucao = instrucao;
    uf.estadoInstrucao = estadoInstrucao;
    uf.tempo = getCiclos(instrucao) + 1;
    uf.ocupado = true;
    uf.operacao = instrucao.operacao;
    uf.endereco = instrucao.registradorS + '+' + instrucao.registradorT;
    uf.destino = instrucao.registradorR;
    uf.posicao = estadoInstrucao.posicao;
    uf.qi = null;
    uf.qj = null;

    if (instrucao.operacao === 'SW') {
        let UFQueTemQueEsperar =
            estacaoRegistradores[instrucao.registradorR];

        if (
            UFQueTemQueEsperar in reservationStation.unidadesFuncionais ||
            UFQueTemQueEsperar in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qi = UFQueTemQueEsperar;
        else uf.qi = null;
    }

    let UFintQueTemQueEsperar =
        estacaoRegistradores[instrucao.registradorT];

    if (
        UFintQueTemQueEsperar in reservationStation.unidadesFuncionais ||
        UFintQueTemQueEsperar in memoryReservationStation.unidadesFuncionaisMemoria
    )
        uf.qj = UFintQueTemQueEsperar;
    else uf.qj = null;
}

function escreveEstacaoRegistrador(instrucao, ufNome) {
    estacaoRegistradores[instrucao.registradorR] = ufNome;
}

function alocaUF(uf, instrucao, estadoInstrucao) {
    uf.instrucao = instrucao;
    uf.estadoInstrucao = estadoInstrucao;
    uf.tempo = getCiclos(instrucao) + 1;
    uf.ocupado = true;
    uf.operacao = instrucao.operacao;
    uf.destino = instrucao.registradorR;
    uf.posicao = estadoInstrucao.posicao;

    let reg_j;
    let reg_k;
    let reg_j_inst;
    let reg_k_inst;

    if (instrucao.operacao === 'BNE' || instrucao.operacao === 'BEQ') {
        reg_j = estacaoRegistradores[instrucao.registradorR];
        reg_k = estacaoRegistradores[instrucao.registradorS];

        reg_j_inst = instrucao.registradorR;
        reg_k_inst = instrucao.registradorS;
    } else {
        reg_j = estacaoRegistradores[instrucao.registradorS];
        reg_k = estacaoRegistradores[instrucao.registradorT];

        reg_j_inst = instrucao.registradorS;
        reg_k_inst = instrucao.registradorT;
    }


    if (reg_j === null || reg_j === undefined) uf.vj = reg_j_inst;
    else {
        if (
            reg_j in reservationStation.unidadesFuncionais ||
            reg_j in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qj = reg_j;
        else uf.vj = reg_j;
    }

    if (reg_k === null || reg_k === undefined) uf.vk = reg_k_inst;
    else {
        if (
            reg_k in reservationStation.unidadesFuncionais ||
            reg_k in memoryReservationStation.unidadesFuncionaisMemoria
        )
            uf.qk = reg_k;
        else uf.vk = reg_k;
    }
}

function liberaUFEsperandoResultado(UF) {

    for (let keyUF in reservationStation.unidadesFuncionais) {
        const ufOlhando = reservationStation.unidadesFuncionais[keyUF];

        if (
            ufOlhando.ocupado === true &&
            (ufOlhando.qj === UF.nome || ufOlhando.qk === UF.nome)
        ) {
            if (ufOlhando.qj === UF.nome) {
                ufOlhando.vj = 'VAL(' + UF.nome + ')';
                ufOlhando.qj = null;
            }

            if (ufOlhando.qk === UF.nome) {
                ufOlhando.vk = 'VAL(' + UF.nome + ')';
                ufOlhando.qk = null;
            }

            if (ufOlhando.qj === null && ufOlhando.qk === null) {
                ufOlhando.tempo = ufOlhando.tempo - 1;
            }
        }
    }

    for (let keyUF in memoryReservationStation.unidadesFuncionaisMemoria) {
        const ufOlhando = memoryReservationStation.unidadesFuncionaisMemoria[keyUF];

        if (ufOlhando.ocupado === true) {
            if (ufOlhando.qi === UF.nome) {
                ufOlhando.qi = null;
                ufOlhando.tempo = ufOlhando.tempo - 1;
            } else if (ufOlhando.qj === UF.nome) {
                ufOlhando.qj = null;
                ufOlhando.tempo = ufOlhando.tempo - 1;
            }
        }
    }
}

function desalocaUFMem(ufMem) {
    ufMem.instrucao = null;
    ufMem.estadoInstrucao = null;
    ufMem.tempo = null;
    ufMem.ocupado = false;
    ufMem.operacao = null;
    ufMem.endereco = null;
    ufMem.destino = null;
    ufMem.posicao = null;
    ufMem.qi = null;
    ufMem.qj = null;
}

function desalocaUF(uf) {
    uf.instrucao = null;
    uf.estadoInstrucao = null;
    uf.tempo = null;
    uf.ocupado = false;
    uf.operacao = null;
    uf.destino = null;
    uf.posicao = null;
    uf.vj = null;
    uf.vk = null;
    uf.qj = null;
    uf.qk = null;
}

function verificaSeJaTerminou() {
    let qtdInstrucaoNaoTerminada = 0;
    for (let i = 0; i < reorderBuffer.estadoInstrucoes.length; i++) {
        const element = reorderBuffer.estadoInstrucoes[i];

        if (element.write === null) qtdInstrucaoNaoTerminada++;
    }

    return qtdInstrucaoNaoTerminada > 0 ? false : true;
}

function issueNovaInstrucao() {

    let novaInstrucao = getNovaInstrucao();

    if (novaInstrucao) {
        let ufInstrucao = verificaUFInstrucao(
            novaInstrucao.instrucao
        );
        let UFParaUsar = getUFVazia(ufInstrucao);
        console.log(JSON.stringify(UFParaUsar))
        if (UFParaUsar) {
            if (
                UFParaUsar.tipoUnidade == 'Load' ||
                UFParaUsar.tipoUnidade == 'Store'
            )
                alocaUfMem(
                    UFParaUsar,
                    novaInstrucao.instrucao,
                    novaInstrucao
                );
            else
                alocaUF(
                    UFParaUsar,
                    novaInstrucao.instrucao,
                    novaInstrucao
                );

            novaInstrucao.issue = clock;

            if (
                UFParaUsar.tipoUnidade !== 'Store' &&
                UFParaUsar.operacao !== 'BEQ' &&
                UFParaUsar.operacao !== 'BEQ'
            )
                escreveEstacaoRegistrador(
                    novaInstrucao.instrucao,
                    UFParaUsar.nome
                );
        }
    }
}

function executaInstrucao() {
    for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
        var ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

        if (
            ufMem.ocupado === true &&
            ufMem.qi === null &&
            ufMem.qj === null
        ) {
            ufMem.tempo = ufMem.tempo - 1;
            console.log('estado Instrucao', ufMem.estadoInstrucao);

            if (ufMem.tempo === 0) {
                ufMem.estadoInstrucao.exeCompleta = clock;
                ufMem.estadoInstrucao.busy = false;
            }
        }
    }

    for (let key in reservationStation.unidadesFuncionais) {
        var uf = reservationStation.unidadesFuncionais[key];

        if (uf.ocupado === true && uf.vj !== null && uf.vk !== null) {
            uf.tempo = uf.tempo - 1;
            uf.estadoInstrucao.busy = true;

            if (uf.tempo === 0) {
                uf.estadoInstrucao.exeCompleta = clock;
                uf.estadoInstrucao.busy = false;
            }
        }
    }
}

function escreveInstrucao() {
    for (let key in memoryReservationStation.unidadesFuncionaisMemoria) {
        const ufMem = memoryReservationStation.unidadesFuncionaisMemoria[key];

        if (ufMem.ocupado === true) {
            if (ufMem.tempo === -1) {
                ufMem.estadoInstrucao.write = clock;

                let valorReg =
                    estacaoRegistradores[
                    ufMem.instrucao.registradorR
                    ];

                if (valorReg === ufMem.nome) {
                    estacaoRegistradores[
                        ufMem.instrucao.registradorR
                    ] = 'VAL(' + ufMem.nome + ')';
                }

                liberaUFEsperandoResultado(ufMem);
                desalocaUFMem(ufMem);
            }
        }
    }

    for (let key in reservationStation.unidadesFuncionais) {
        const uf = reservationStation.unidadesFuncionais[key];

        if (uf.ocupado === true) {
            if (uf.tempo === -1) {
                uf.estadoInstrucao.write = clock;

                let valorReg =
                    estacaoRegistradores[
                    uf.instrucao.registradorR
                    ];

                if (valorReg === uf.nome) {
                    estacaoRegistradores[
                        uf.instrucao.registradorR
                    ] = 'VAL(' + uf.nome + ')';
                }

                liberaUFEsperandoResultado(uf);
                desalocaUF(uf);
            }
        }
    }
}

function executa_ciclo() {

    clock++;

    issueNovaInstrucao();
    executaInstrucao();
    escreveInstrucao();

    console.log('Estado instrução:');
    console.log(JSON.stringify(reorderBuffer.estadoInstrucoes, null, 2));

    console.log('\nUnidades Funcionais memória:');
    console.log(JSON.stringify(memoryReservationStation.unidadesFuncionaisMemoria, null, 2));

    console.log('\nUnidades Funcionais:');
    console.log(JSON.stringify(reservationStation.unidadesFuncionais, null, 2));

    console.log('Estado registradores:');
    console.log(JSON.stringify(estacaoRegistradores, null, 2));

    return verificaSeJaTerminou();
}

const config = new Config()

const reorderBuffer = new ReorderBuffer(config.numInstrucoes)

const reservationStation = new ReservationStation(config)

const memoryReservationStation = new MemoryReservationStation(config)

executa_ciclo()
executa_ciclo()
executa_ciclo()
// executa_ciclo()

