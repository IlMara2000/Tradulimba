import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSpeechScript, normalizeSpeechVariant } from '../src/features/translation/speechScript.js'

test('una varietà assente o sconosciuta ricade sulla LSC', () => {
  assert.equal(normalizeSpeechVariant(undefined), 'lsc')
  assert.equal(normalizeSpeechVariant(''), 'lsc')
  assert.equal(normalizeSpeechVariant('gallurese'), 'lsc')
  assert.equal(normalizeSpeechVariant('campidanese'), 'campidanese')
})

test('tz diventa zz, il digramma che una voce italiana legge [ts]', () => {
  assert.equal(buildSpeechScript('petza', 'lsc'), 'pezza')
  assert.equal(buildSpeechScript('putzu', 'lsc'), 'puzzu')
  assert.equal(buildSpeechScript('tziu', 'lsc'), 'zziu')
})

test('la s intervocalica resta sorda', () => {
  assert.equal(buildSpeechScript('sa casa de mesa', 'lsc'), 'sa cassa de messa')
})

test('la s finale e i nessi con consonante non vengono toccati', () => {
  assert.equal(buildSpeechScript('Sas domos sunt mannas', 'lsc'), 'Sas domos sunt mannas')
})

test('j diventa i e i nessi lli/nni seguono la grafia italiana', () => {
  assert.equal(buildSpeechScript('maju ruju', 'lsc'), 'maiu ruiu')
  assert.equal(buildSpeechScript('màllia', 'lsc'), 'màglia')
  assert.equal(buildSpeechScript('campànnia', 'lsc'), 'campàgnia')
})

test('in campidanese la d intervocalica passa a r, altrove resta', () => {
  assert.equal(buildSpeechScript('meda', 'campidanese'), 'mera')
  assert.equal(buildSpeechScript('meda', 'lsc'), 'meda')
  assert.equal(buildSpeechScript('meda', 'logudorese'), 'meda')
  assert.equal(buildSpeechScript('sardu', 'campidanese'), 'sardu')
})

test('la x segue la convenzione della varietà', () => {
  assert.equal(buildSpeechScript('boxi', 'campidanese'), 'bogi')
  assert.equal(buildSpeechScript('mataxa', 'lsc'), 'matassa')
})

test('in campidanese le finali -o/-e si avvicinano al parlato -u/-i', () => {
  assert.equal(buildSpeechScript('domo', 'campidanese'), 'domu')
  assert.equal(buildSpeechScript('pane e binu', 'campidanese'), 'pani e binu')
  assert.equal(buildSpeechScript('domos e canes', 'campidanese'), 'domus e canis')
  assert.equal(buildSpeechScript('bona die', 'campidanese'), 'bona die')
  assert.equal(buildSpeechScript('domo', 'lsc'), 'domo')
})

test('gi e z restano intatti: [dʒ] è una realizzazione attestata, [dz] non è raggiungibile', () => {
  for (const variant of ['lsc', 'campidanese', 'logudorese']) {
    assert.equal(buildSpeechScript('su fìgiu', variant), 'su fìgiu')
    assert.equal(buildSpeechScript('sa bìngia', variant), 'sa bìngia')
    assert.equal(buildSpeechScript('su fizu ghennarzu', variant), 'su fizu ghennarzu')
    assert.equal(
      buildSpeechScript('organizare', variant),
      variant === 'campidanese' ? 'organizari' : 'organizare',
    )
  }
})

test('il testo italiano, le maiuscole e la punteggiatura restano leggibili', () => {
  assert.equal(buildSpeechScript('Ciao, come stai?', 'lsc'), 'Ciao, come stai?')
  assert.equal(buildSpeechScript('Petza e binu!', 'lsc'), 'Pezza e binu!')
})

test('un testo assente non produce trascrizione', () => {
  assert.equal(buildSpeechScript('', 'lsc'), '')
  assert.equal(buildSpeechScript(undefined, 'lsc'), '')
})
