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
    for (let key in reservationStation) {
        var uf = reservationStation[key];

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
    uf.tempo = this.getCiclos(instrucao) + 1;
    uf.ocupado = true;
    uf.operacao = instrucao.operacao;
    uf.destino = instrucao.registradorR;
    uf.posicao = estadoInstrucao.posicao;

    let reg_j;
    let reg_k;
    let reg_j_inst;
    let reg_k_inst;

    if (instrucao.operacao === 'C.BNEZ' || instrucao.operacao === 'BEQ') {
        reg_j = this.estacaoRegistradores[instrucao.registradorR];
        reg_k = this.estacaoRegistradores[instrucao.registradorS];

        reg_j_inst = instrucao.registradorR;
        reg_k_inst = instrucao.registradorS;
    } else {
        reg_j = this.estacaoRegistradores[instrucao.registradorS];
        reg_k = this.estacaoRegistradores[instrucao.registradorT];

        reg_j_inst = instrucao.registradorS;
        reg_k_inst = instrucao.registradorT;
    }


    if (reg_j === null || reg_j === undefined) uf.vj = reg_j_inst;
    else {
        if (
            reg_j in this.unidadesFuncionais ||
            reg_j in this.unidadesFuncionaisMemoria
        )
            uf.qj = reg_j;
        else uf.vj = reg_j;
    }

    if (reg_k === null || reg_k === undefined) uf.vk = reg_k_inst;
    else {
        if (
            reg_k in this.unidadesFuncionais ||
            reg_k in this.unidadesFuncionaisMemoria
        )
            uf.qk = reg_k;
        else uf.vk = reg_k;
    }
}

console.log(estacaoRegistradores)

const config = new Config()

const reorderBuffer = new ReorderBuffer(config.numInstrucoes)

const reservationStation = new ReservationStation(config)

const memoryReservationStation = new MemoryReservationStation(config)

var ufVazia = getUFVazia(verificaUFInstrucao(getNovaInstrucao().instrucao))

console.log(reorderBuffer.estadoInstrucoes[0].posicao)
console.log(alocaUfMem(ufVazia, getNovaInstrucao().instrucao, reorderBuffer.estadoInstrucoes[0]))
