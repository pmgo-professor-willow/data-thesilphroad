// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { getPokemonNameByNo, getPokemonByFuzzyName, transType } from 'pmgo-pokedex';
import { sprintf } from 'sprintf-js';
// Local modules.
import { hostUrl, assetUrl } from './utils';
import tags from '../data/research-category-tags.json';
import descriptionDict from '../data/research-description-dictionary.json';

interface Resaerch {
  description: string;
  originalDescription: string;
  category: string;
  rewardPokemons: RewardPokemon[];
}

interface RewardPokemon {
  no: number;
  name: string;
  originalName: string;
  cp: {
    min: number;
    max: number;
  };
  shinyAvailable: boolean;
}

const categoryMapping = (categoryTag: string) => {
  const matchedTag = tags.find((tag) => {
    return tag.text === categoryTag
      || new RegExp(tag.text, 'i').test(categoryTag);
  });

  if (matchedTag) {
    return matchedTag.displayText;
  } else {
    return tags.find((tag) => tag.text === 'Miscellaneous Tasks')?.displayText!;
  }
};

const translateDescription = (descriptionRaw: string) => {
  // Remove the prefix: 'Event: '.
  const description = descriptionRaw.replace(/^Event: /, '');
  const matchedRule = descriptionDict.find((rule) => (new RegExp(rule.pattern, 'i')).test(description));

  if (matchedRule) {
    const [, ...matches] = description.match(new RegExp(matchedRule.pattern, 'i'))!;

    // Translate term 'pokemon type'.
    const types = description.match(/(\w+-(type)?)/ig) || [];

    let translatedDescription = types.reduce((currentDisplayText, type) => {
      const formattedType = /-type/i.test(type) ? type : `${type}type`
      return currentDisplayText.replace(type, transType(formattedType)!);
    }, sprintf(matchedRule.displayText, ...matches));

    // Replace specific pokemon name.
    const pokemonNamePatterns = translatedDescription.match(/##POKEMON_(\w+)##/g) || [];
    pokemonNamePatterns.forEach((pokemonNamePattern) => {
      const { 1: pokemonRawName } = pokemonNamePattern.match(/##POKEMON_(\w+)##/)!;
      translatedDescription = translatedDescription.replace(pokemonNamePattern, getPokemonByFuzzyName(pokemonRawName).name);
    });

    return translatedDescription;
  }

  // Cannot find any rule from dictionary, keep original.
  return description;
};

const getResearches = async () => {
  const researchUrl = urlJoin(hostUrl, '/research-tasks/');
  const res = await fetch(researchUrl);
  const xml = await res.text();

  const root = parse(xml);

  const researches: Resaerch[] = [];

  const researchGroupItems = root.querySelectorAll('.task-group');
  researchGroupItems.forEach((researchGroupItem) => {
    const researchItems = researchGroupItem.querySelectorAll('.task');

    researchItems.forEach((researchItem, i) => {
      const rewardPokemonItems = researchItem.querySelectorAll('.taskRewardsWrap .task-reward.pokemon');
      const rewardPokemons = rewardPokemonItems.map((rewardPokemonItem) => {
        const imageUrlRaw = rewardPokemonItem.querySelector('img')?.getAttribute('src')!;

        // No.
        let no = -1;
        let form = "";
        switch (true) {
          case /(\d+)\.png$/.test(imageUrlRaw): {
            const { 1: noText } = imageUrlRaw.match(/(\d+)\.png$/)!;
            no = parseInt(noText);
            break;
          }
          case /([\w-]+)\.png$/.test(imageUrlRaw): {
            const { 1: nameText } = imageUrlRaw.match(/([\w-]+)\.png$/)!;
            const pokemon = getPokemonByFuzzyName(nameText);
            no = pokemon.no;
            form = pokemon.form;
            break;
          }
        }

        // CP
        const { 1: minCpItem, 3: maxCpItem } = rewardPokemonItem.querySelectorAll('.cp p')!;
        const minCP = parseInt(minCpItem.rawText.trim().replace(/,/g, ''));
        const maxCP = parseInt(maxCpItem.rawText.trim().replace(/,/g, ''));

        // Shiny Available
        const shinyAvailable = !!rewardPokemonItem.getAttribute('class')?.includes('shinyAvailable');

        // Image Url bases on form (_00: normal ; _31: galarian ; _61: alolan)
        let formIndex = "00";
        if (form === "阿羅拉") {
          formIndex = "61";
        } else if (form === "伽勒爾") {
          formIndex = "31";
        }

        return {
          no,
          name: getPokemonNameByNo(no, 'zh-TW')!,
          originalName: getPokemonNameByNo(no, 'en-US')!,
          cp: {
            min: minCP,
            max: maxCP,
          },
          shinyAvailable,
          // TODO: using more stable version
          imageUrl: imageUrlRaw,
          // imageUrl: urlJoin(assetUrl, `pokemon_icon_${no.toString().padStart(3, '0')}_${formIndex}.png`),
        };
      });

      researches.push({
        description: translateDescription(researchItem.querySelector('.taskText')?.rawText.trim()!),
        originalDescription: researchItem.querySelector('.taskText')?.rawText.trim()!,
        category: categoryMapping(researchGroupItem.querySelector('h3')?.rawText.trim()!),
        rewardPokemons,
      });
    });
  });

  const sortedResearches = _.orderBy(researches, (research) => {
    const matchedTag = tags.find((tag) => tag.displayText === research.category);
    return matchedTag?.priority;
  }, ['asc']);

  return sortedResearches;
};

export {
  getResearches,
};
