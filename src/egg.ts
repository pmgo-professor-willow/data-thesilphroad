// Node modules.
import _ from 'lodash';
import fetch from 'node-fetch';
import { parse, HTMLElement } from 'node-html-parser';
import urlJoin from 'url-join';
import { getPokemonNameByNo } from 'pmgo-pokedex';
// Local modules.
import { hostUrl } from './utils';

interface Egg {
  no: number;
  name: string;
  originalName: string;
  category: string;
  cp: {
    min: number;
    max: number;
  };
  shinyAvailable: boolean;
  regional: boolean;
  imageUrl: string;
  rate: number;
}

const extractEggsInfo = (root: HTMLElement, category: string, selector: string) => {
  const eggElements = root.querySelectorAll(selector);

  const eggs: Egg[] = eggElements.map((eggElement) => {
    const no = parseInt(eggElement.getAttribute('data-species-num') || '-1');
    const name = getPokemonNameByNo(no)!;
    const originalName = eggElement.querySelector('.speciesName')!?.text.trim();
    const [maxCP, minCP] = eggElement.querySelectorAll('.row-fluid .row-fluid').map((rowElement) => {
      return parseInt(rowElement.querySelector('div div div:last-child')?.text.trim()!);
    });
    const shinyAvailable = !!eggElement.querySelector('.shinyIcon');
    const regional = !!eggElement.querySelector('.regionalIcon');
    const imageUrl = eggElement.querySelector(':not(.icons) > img')?.getAttribute('src')!;
    const rate = parseFloat(eggElement.querySelector('.speciesCount b')!?.text.trim());
    
    return {
      no,
      name,
      originalName,
      category,
      cp: {
        min: minCP,
        max: maxCP,
      },
      shinyAvailable,
      regional,
      imageUrl,
      rate,
    };
  });

  return eggs;
};

const getEggs = async () => {
  const eggUrl = urlJoin(hostUrl, '/egg-distances/');
  const res = await fetch(eggUrl);
  const xml = await res.text();

  const root = parse(xml);

  const eggs = [
    // 2km.
    ...extractEggsInfo(root, '2km', '#kms2 .eggColumn .speciesWrap'),
    // 5km.
    ...extractEggsInfo(root, '5km', '#kms5 .eggColumn .speciesWrap'),
    // 10km.
    ...extractEggsInfo(root, '10km', '#kms10 .eggColumn .speciesWrap'),
    // 7km.
    ...extractEggsInfo(root, '7km', '#gifts7 .eggColumn .speciesWrap'),
    // 12km.
    ...extractEggsInfo(root, '12km', '#shadow12 .eggColumn .speciesWrap'),
    // 5km (adventure sync).
    ...extractEggsInfo(root, 'as5km', '#as5 .eggSubColumn[data-subgroup="5"] .speciesWrap'),
    // 10km (adventure sync).
    ...extractEggsInfo(root, 'as10km', '#as5 .eggSubColumn[data-subgroup="10"] .speciesWrap'),
  ];

  return eggs;
};

export {
  getEggs,
};
