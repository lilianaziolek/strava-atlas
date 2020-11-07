import './ViewerTable.css';

import m, { VnodeDOM } from 'mithril';
import Stream from 'mithril/stream';
import _ from 'lodash';

import { redrawOn, toggle } from '../shared';
import { Act } from '../Act';
import ViewerTableRow from './ViewerTableRow';


type Column = 'date' | 'time' | 'distance' | 'elevation';
type Dir = 'asc' | 'desc';

interface ViewerTableAttrs {
  acts$: Stream<Act[]>,
  filteredActs$Out: Stream<Act[]>,
  hoveredActId$: Stream<number | undefined>,
  selectedActId$: Stream<number | undefined>,
}
const ViewerTable: m.ClosureComponent<ViewerTableAttrs> = ({attrs: {acts$, selectedActId$, hoveredActId$, filteredActs$Out}}) => {
  let headerDom: HTMLElement | undefined;
  let headerOpen = false;

  const typeFilter$ = Stream('All' as string);
  const nameFilter$ = Stream(undefined as string | undefined);

  const sort$ = Stream({column: 'date' as Column, dir: 'desc' as Dir});
  const columnToDataPath = {
    date: 'data.start_date',
    time: 'data.moving_time',
    distance: 'data.distance',
    elevation: 'data.total_elevation_gain',
  };

  const filteredActs$ = Stream.lift((acts, typeFilter, nameFilter) => {
    let out = acts;
    if (typeFilter !== 'All') {
      out = out.filter((act) => act.data.type === typeFilter);
    }
    if (nameFilter) {
      const nameFilterLower = nameFilter.toLowerCase();
      out = out.filter((act) => act.data.name.toLowerCase().match(nameFilterLower));
    }
    return out;
  }, acts$, typeFilter$, nameFilter$);

  // TODO: Kinda strange structure we have going here
  filteredActs$.map((x) => filteredActs$Out(x));

  const sortedActs$ = Stream.lift((filteredActs, sort) => {
    return _.orderBy(filteredActs, columnToDataPath[sort.column], sort.dir);
  }, filteredActs$, sort$);

  function toggleSort(toggleColumn: Column) {
    const {column, dir} = sort$();
    if (column === toggleColumn) {
      sort$({column, dir: dir === 'asc' ? 'desc' : 'asc'});
    } else {
      sort$({column: toggleColumn, dir: 'desc'});
    }
  }

  function oncreateScroller({dom}: VnodeDOM) {
    selectedActId$.map((selectedActId) => {
      console.log('act changed');
      const selectedAct = _.find(acts$(), (act) => act.data.id === selectedActId);
      if (selectedAct) {
        // scroll to activity in table
        let tableRow = selectedAct.tableRow;
        console.log('scrolling', tableRow);
        if (tableRow) {
          const tableScrollerRect = dom.getBoundingClientRect();
          const tableRowRect = tableRow.getBoundingClientRect();
          if (tableRowRect.top < tableScrollerRect.top || tableRowRect.bottom > tableScrollerRect.bottom) {
            tableRow.scrollIntoView({block: 'center', behavior: 'smooth'});
          }
        }
      }
    });
  }

  function columnLabel(column: Column) {
    const {column: sortColumn, dir: sortDir} = sort$();
    return m('.ViewerTable-column-label', {
      class: sortColumn === column ? 'ViewerTable-column-label-' + sortDir : undefined,
      onclick: () => toggleSort(column),
    }, column);
  }

  redrawOn(filteredActs$, hoveredActId$, selectedActId$, sort$);

  return {
    view: () => {
      const types = _.chain(acts$())
        .groupBy('data.type')
        .toPairs()
        .orderBy(([type, actsOfType]) => actsOfType.length, 'desc')
        .map(([type, actsOfType]) => type)
        .value();
      const typeOptions = ['All', ...types];

      return m('.ViewerTable',
        m('.ViewerTable-header', {
          class: headerOpen ? 'ViewerTable-header-open' : 'ViewerTable-header-closed',
          oncreate: ({dom}) => headerDom = dom as HTMLElement,
        },
          m('.ViewerTable-fake-row.ViewerTableRow',
            m('.ViewerTableRow-left',
              m('select.ViewerTableRow-type-selector', {
                value: typeFilter$(),
                onchange: (ev: InputEvent) => typeFilter$(typeOptions[(ev.target as HTMLSelectElement).selectedIndex]),
              },
                typeOptions.map(typeOption => m('option', typeOption)),
              )
            ),
            m('.ViewerTableRow-right',
              m('.ViewerTableRow-name',
                m('.ViewerTable-name-filter-container',
                  m('input.ViewerTable-name-filter', {
                    value: nameFilter$(),
                    oninput: (ev: InputEvent) => nameFilter$((ev.target as HTMLInputElement).value),
                    placeholder: 'Activity name',
                  }),
                  nameFilter$() && (
                    m('.ViewerTable-name-filter-clear', {
                      onclick: () => nameFilter$(undefined),
                    })
                  )
                )
              ),
              m('.ViewerTableRow-date', columnLabel('date')),
              m('.ViewerTableRow-stat', columnLabel('time')),
              m('.ViewerTableRow-stat', columnLabel('distance')),
              m('.ViewerTableRow-stat', columnLabel('elevation')),
            ),
          ),
        ),
        m('.ViewerTable-scroller', {oncreate: oncreateScroller},
          m('.ViewerTable-acts',
            sortedActs$().map((act) =>
              m(ViewerTableRow, {
                act,
                isHovered: act.data.id === hoveredActId$(),
                isSelected: act.data.id === selectedActId$(),
                oncreate: (vnode) => act.tableRow = vnode.dom as HTMLElement,
                attrs: {
                  onmouseover: () => hoveredActId$(act.data.id),
                  onmouseout: () => hoveredActId$(undefined),
                  onclick: () => toggle(selectedActId$, act.data.id),
                },
              }),
            )
          ),
        ),
        typeFilter$() === 'All' && !nameFilter$() && (
          m('.ViewerTable-header-toggle', {
            class: headerOpen ? 'ViewerTable-header-toggle-close': 'ViewerTable-header-toggle-open',
            onclick: () => {
              headerOpen = !headerOpen;
              if (headerDom) {
                headerDom.style.height = (headerOpen ? headerDom.scrollHeight : 0) + 'px';
              }
            },
          })
        )
      );
    },
  };
};
export default ViewerTable;