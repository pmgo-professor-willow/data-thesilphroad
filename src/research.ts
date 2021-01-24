// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import urlJoin from 'url-join';
import { getPokemonNameByNo } from 'pmgo-pokedex';
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
  const matchedTag = tags.find((tag) => tag.text === categoryTag);

  if (matchedTag) {
    return matchedTag.displayText;
  } else {
    return tags.find((tag) => tag.text === 'Miscellaneous Tasks')?.displayText!;
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
        const imageUrlRaw = rewardPokemonItem.querySelector('img').getAttribute('src')!;

        // No.
        const { 1: noText } = imageUrlRaw.match(/(\d+)\.png$/)!;
        const no = parseInt(noText);

        // CP
        const { 1: minCpItem, 3: maxCpItem } = rewardPokemonItem.querySelectorAll('.cp p')!;
        const minCP = parseInt(minCpItem.rawText.trim());
        const maxCP = parseInt(maxCpItem.rawText.trim());

        // Shiny Available
        const shinyAvailable = !!rewardPokemonItem.getAttribute('class')?.includes('shinyAvailable');

        return {
          no,
          name: getPokemonNameByNo(no, 'zh-TW')!,
          originalName: getPokemonNameByNo(no, 'en-US')!,
          cp: {
            min: minCP,
            max: maxCP,
          },
          shinyAvailable,
          imageUrl: urlJoin(assetUrl, `pokemon_icon_${no}_00.png`),
        };
      });

      researches.push({
        description: translateDescription(researchItem.querySelector('.taskText').rawText.trim()),
        originalDescription: researchItem.querySelector('.taskText').rawText.trim(),
        category: categoryMapping(researchGroupItem.querySelector('h3').rawText.trim()),
        rewardPokemons,
      });
    });
  });

  return researches;
};

export {
  getResearches,
};
