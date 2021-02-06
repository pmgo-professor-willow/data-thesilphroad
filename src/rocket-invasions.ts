// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { getPokemonNameByNo } from 'pmgo-pokedex';
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
        const { 1: noText } = imageUrlRaw.match(/(\d+)\.png$/)!;
        const no = parseInt(noText);

        // Catchable
        const catchable = !!lineupPokemonItem.querySelectorAll('.icons .pokeballIcon').length;

        // Shiny Available
        const shinyAvailable = !!lineupPokemonItem.querySelectorAll('.icons .shinyIcon').length;

        all.push({
          slotNo,
          no,
          name: getPokemonNameByNo(no, 'zh-TW')!,
          originalName: getPokemonNameByNo(no, 'en-US')!,
          catchable,
          shinyAvailable,
          imageUrl: urlJoin(assetUrl, `pokemon_icon_${no.toString().padStart(3, '0')}_00.png`),
        });
      });

      return all;
    }, [] as LineupPokemon[]);

    const orignialQuote = rocketInvasionItem.querySelector('.lineupHeader .quote')?.rawText.trim()
      .replace(/[“”]/g, '') || '';

    const categoryElement = rocketInvasionItem.querySelector('.lineupHeader h3');
    const categoryRaw = categoryElement.rawText.trim();

    const characterImageUrlRaw = rocketInvasionItem.querySelector('.lineupHeader .character').getAttribute('style')!
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
