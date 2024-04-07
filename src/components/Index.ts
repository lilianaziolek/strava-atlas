import _ from 'lodash';
import m from 'mithril';
import Stream from 'mithril/stream';

import JSONStorageItem from '../JSONStorageItem';
import {fetchActivitiesOrRoutes, OAuthResponse, StravaShortSummary} from '../stravaApi';
import Viewer from './Viewer';
import Welcome from './Welcome';


const actDataStorage = new JSONStorageItem<StravaShortSummary[]>('actData');
const tokenStorage = new JSONStorageItem<OAuthResponse>('token');
const syncDateStorage = new JSONStorageItem<number>('syncDate');

const authenticateInFrontend = false;

const Index: m.ClosureComponent = () => {
  // This is a stream containing a complete set of all the user's activities and/or routes
  const actData$ = Stream<StravaShortSummary[] | undefined>(undefined);
  const actDataFromLS = actDataStorage.get();
  if (actDataFromLS) {
    actData$(actDataFromLS);
  }
  actData$.map((actData) => {
    if (actData) {
      actDataStorage.set(actData);
    }
  });

  // This is a stream containing the (possibly partial) set of activities being downloaded for the user
  const actDataSync$ = Stream<StravaShortSummary[] | undefined>();

  // This is a stream containing the last sync date
  const syncDate$ = Stream<number>();
  const syncDateFromLS = syncDateStorage.get();
  if (syncDateFromLS) {
    syncDate$(syncDateFromLS);
  }
  syncDate$.map((syncDate) => {
    syncDateStorage.set(syncDate);
  });

  // Grab token from the search param, if there is one
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromSP = urlParams.get('token');
  if (tokenFromSP) {
    tokenStorage.setRaw(tokenFromSP);
    window.history.replaceState({}, '', '/');
    syncAll();  // if we just authed, we should certainly sync
  } else if (authenticateInFrontend) {
    // Try using token in LS
    let token = tokenStorage.get();
    if (token) {
      // If it's been long enough, get a sync going
      const syncDate = syncDate$();
      if (!syncDate || +new Date() - syncDate > 1000 * 60 * 60) {
        syncAll();
      }
    }
  } else {
    syncAll();
  }

  async function sync({fromScratch, type}: { fromScratch: boolean, type: string }) {
    let token = undefined;
    if (authenticateInFrontend) {
      token = tokenStorage.get();
      if (token) {
        // Refresh the token if necessary
        if (token.expires_at * 1000 < +new Date()) {
          token = await m.request<OAuthResponse>({
            url: `/api/submit-refresh-token?refresh_token=${token.refresh_token}`,
          });
          // TODO: error handling
          tokenStorage.set(token);
        }
      } else {
        window.location.href = 'api/redirect-to-auth';
      }
    }

      let afterTime: number | undefined = undefined;
      let actData = actData$();
      if (!fromScratch && actData && actData.length > 0) {
        actDataSync$(actData);
        const times = actData.map((act) => +new Date(act.startDate) / 1000);
        afterTime = _.max(times);
      } else {
        actDataSync$([]);
      }

    await fetchActivitiesOrRoutes(type, token?.access_token,
      (newActData) => {
        // This runs whenever a new page of data comes in
        if (fromScratch) {
          actDataSync$(newActData);
        } else {
          actDataSync$([...actData$() || [], ...newActData]);
        }
        m.redraw();
      }, undefined, afterTime);

      actData$(actDataSync$()!);
      actDataSync$(undefined);
      syncDate$(+new Date());
  }

  async function syncAll() {
    sync({fromScratch: true, type: "routes"});
    sync({fromScratch: false, type: "activities"});
  }

  return {
    view: () => {
      // To test the welcome screen:
      // return m(Welcome, {actDataSync$: Stream() as any});

      // To test the loading screen:
      // return m(Welcome, {actDataSync$: Stream([]) as any});

      if (actData$()) {
        return m(Viewer, {actData$: actData$ as Stream<StravaShortSummary[]>, actDataSync$, syncDate$, sync});
      } else {
        return m(Welcome, {actDataSync$});
      }
    },
  };
};
export default Index;
