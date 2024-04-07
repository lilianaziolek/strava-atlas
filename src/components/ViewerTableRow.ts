import './ViewerTableRow.css';

import m from 'mithril';
import classnames from 'classnames';
import dayjs from 'dayjs';

import { Act } from '../Act';
import '../strava-icons.css';


function formatDuration(secs: number) {
  let mins = Math.round(secs / 60);

  let mPart = mins % 60;
  let hPart = Math.floor(mins / 60);

  if (hPart > 0) {
    return [hPart, m('.ViewerTableRow-unit', 'h'), `00${mPart}`.slice(-2), m('.ViewerTableRow-unit', 'm')];
  } else {
    return [mPart, m('.ViewerTableRow-unit', 'm')];
  }
}


interface ViewerTableRowAttrs {
  act: Act,
  isVisible: boolean,
  isHovered: boolean,
  isHoveredDirectly: boolean,
  isSelected: boolean,
  attrs: m.Attributes,
}
const ViewerTableRow: m.ClosureComponent<ViewerTableRowAttrs> = () => {
  return {
    view: ({attrs: {act, isVisible, isHovered, isHoveredDirectly, isSelected, attrs}}) => {
        let url = (act.data.startLatlng != null) ? `https://www.strava.com/activities/${act.data.id}` : `https://www.strava.com/routes/${act.data.id}`;
        return m('.ViewerTableRow',
        {
          id: `ViewerTableRow-${act.data.id}`,
          class: classnames({invisible: !isVisible, hovered: isHovered, "hovered-directly": isHoveredDirectly, selected: isSelected}),
          ...attrs,
        },
        m('.ViewerTableRow-left', {class: `app-icon icon-${act.data.type.toLowerCase()}`, title: act.data.type}),
        m('.ViewerTableRow-right',
          m('.ViewerTableRow-name',
            act.data.name,
            act.latLngs === undefined && [' ', m('span.ViewerTableRow-no-map', '[no map]')]
          ),
          m('.ViewerTableRow-date', dayjs(act.data.startDate).format('YYYY-MM-DD dd')),
          m('.ViewerTableRow-stat', formatDuration(act.data.movingTime)),
          m('.ViewerTableRow-stat', (act.data.distance/ 1000).toFixed(1), m('.ViewerTableRow-unit', 'km')),
          m('.ViewerTableRow-stat', (act.data.totalElevationGain), m('.ViewerTableRow-unit', 'm')),
          m('a.ViewerTableRow-strava-link', {
              href: url,
              onclick: (ev: Event) => ev.stopPropagation(),
              target: '_blank',
            },
            m('img.ViewerTableRow-strava-link-img', {src: 'strava-2.svg'}))
        ),
      );
    },
  };
};
export default ViewerTableRow;
