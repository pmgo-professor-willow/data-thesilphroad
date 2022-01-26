// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { decode } from 'html-entities';
import urlJoin from 'url-join';
import { getPokemonNameByNo, getPokemonByFuzzyName } from 'pmgo-pokedex';
import { sprintf } from 'sprintf-js';
// Local modules.
import { hostUrl, assetUrl } from './utils';
import tags from '../data/rocket-invasion-category-tags.json';
import descriptionDict from '../data/rocket-invasion-description-dictionary.json';

interface RocketInvasion {
  quote: string;
  orignialQuote: string;
  category: string;
  characterImageUrl: string;
  isSpecial: boolean;
  lineupPokemons: LineupPokemon[];
}

interface LineupPokemon {
  slotNo: number;
  no: number;
  name: string;
  originalName: string;
  types: string[];
  catchable: boolean;
  shinyAvailable: boolean;
  imageUrl: string;
}

const categoryMapping = (categoryTag: string) => {
  const matchedTag = tags.find((tag) => tag.text === categoryTag);

  if (matchedTag) {
    return matchedTag.displayText;
  } else {
    return categoryTag;
  }
};

const translateDescription = (description: string) => {
  const matchedRule = descriptionDict.find((rule) => (new RegExp(rule.pattern, 'i')).test(description));

  if (matchedRule) {
    const [, ...matches] = description.match(new RegExp(matchedRule.pattern, 'i'))!;
    return sprintf(matchedRule.displayText, ...matches);
  } else {
    return description;
  }
};

const getRocketInvasions = async () => {
  const rocketInvasionUrl = urlJoin(hostUrl, '/rocket-invasions/');
  const res = await fetch(rocketInvasionUrl);
  const xml = await res.text();

  const root = parse(xml);

  const rocketInvasions: RocketInvasion[] = [];

  const rocketInvasionItems = root.querySelectorAll('.lineupGroup');
  rocketInvasionItems.forEach((rocketInvasionItem) => {
    const lineupSlotItems = rocketInvasionItem.querySelectorAll('.lineupSpecies .lineupSlot');
    const lineupPokemons = lineupSlotItems.reduce((all, lineupSlotItem, i) => {
      const slotNo = i + 1;
      const lineupPokemonItems = lineupSlotItem.querySelectorAll('.speciesWrap');
      lineupPokemonItems.forEach((lineupPokemonItem) => {
        const imageUrlsRaw = lineupPokemonItem.querySelectorAll('img');
        const imageUrlRaw = imageUrlsRaw.find((urlRaw) => !urlRaw.getAttribute('class'))!.getAttribute('src')!;

        // No.
        let no = -1;
        let form = '';
        let name = '';
        let originalName = '';
        const types: string[] = [];
        switch (true) {
          case /(\d+)\.png$/.test(imageUrlRaw): {
            const { 1: noText } = imageUrlRaw.match(/(\d+)\.png$/)!;
            no = parseInt(noText);
            name = getPokemonNameByNo(no, 'zh-TW')!;
            originalName = getPokemonNameByNo(no, 'en-US')!;
            types.push(...getPokemonByFuzzyName(originalName).types);
            break;
          }
          case /([\w-]+)\.png$/.test(imageUrlRaw): {
            const { 1: nameText } = imageUrlRaw.match(/([\w-]+)\.png$/)!;
            const pokemon = getPokemonByFuzzyName(nameText);
            no = pokemon.no;
            form = pokemon.form;
            name = getPokemonNameByNo(no, 'zh-TW')!;
            originalName = getPokemonNameByNo(no, 'en-US')!;
            types.push(...pokemon.types);
            break;
          }
        }

        // Catchable
        const catchable = !!lineupPokemonItem.querySelectorAll('.icons .pokeballIcon').length;

        // Shiny Available
        const shinyAvailable = !!lineupPokemonItem.querySelectorAll('.icons .shinyIcon').length;

        // Image Url bases on form (_00: normal ; _31: galarian ; _61: alolan)
        let formIndex = '00';
        if (form === '阿羅拉') {
          formIndex = '61';
        } else if (form === '伽勒爾') {
          formIndex = '31';
        }

        all.push({
          slotNo,
          no,
          name,
          originalName,
          types,
          catchable,
          shinyAvailable,
          imageUrl: urlJoin(assetUrl, `pokemon_icon_${no.toString().padStart(3, '0')}_${formIndex}.png`),
        });
      });

      return all;
    }, [] as LineupPokemon[]);

    const orignialQuote = decode(
      rocketInvasionItem.querySelector('.lineupHeader .quote')?.rawText.trim().replace(/[“”]/g, '') || ''
    );

    const categoryElement = rocketInvasionItem.querySelector('.lineupHeader h3')!;
    const categoryRaw = categoryElement.rawText.trim()!;

    const characterImageUrlRaw = rocketInvasionItem.querySelector('.lineupHeader .character')?.getAttribute('style')!
    const { 1: characterImageUrl } = characterImageUrlRaw.match(/url\((.+)\)/)!;


    rocketInvasions.push({
      quote: translateDescription(orignialQuote),
      orignialQuote,
      category: categoryMapping(categoryRaw),
      characterImageUrl,
      isSpecial: !!categoryElement.getAttribute('class')?.includes('specialFoe'),
      lineupPokemons,
    });
  });

  const sortedRocketInvasions = _.orderBy(rocketInvasions, (rocketInvasion) => {
    const matchedTag = tags.find((tag) => tag.displayText === rocketInvasion.category);
    return matchedTag?.priority;
  }, ['asc']);

  return sortedRocketInvasions;
};

export {
  getRocketInvasions,
};
