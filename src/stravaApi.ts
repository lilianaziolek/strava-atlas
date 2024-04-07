import m from 'mithril';

export interface StravaPolylineMap {
  id: string,
  polyline: string | null,
  summary_polyline: string | null,
}

export enum StravaActivityType {
  AlpineSki = 'AlpineSki',
  BackcountrySki = 'BackcountrySki',
  Canoeing = 'Canoeing',
  Crossfit = 'Crossfit',
  EBikeRide = 'EBikeRide',
  Elliptical = 'Elliptical',
  Hike = 'Hike',
  IceSkate = 'IceSkate',
  InlineSkate = 'InlineSkate',
  Kayaking = 'Kayaking',
  Kitesurf = 'Kitesurf',
  NordicSki = 'NordicSki',
  Ride = 'Ride',
  RockClimbing = 'RockClimbing',
  RollerSki = 'RollerSki',
  Rowing = 'Rowing',
  Run = 'Run',
  Snowboard = 'Snowboard',
  Snowshoe = 'Snowshoe',
  StairStepper = 'StairStepper',
  StandUpPaddling = 'StandUpPaddling',
  Surfing = 'Surfing',
  Swim = 'Swim',
  VirtualRide = 'VirtualRide',
  Walk = 'Walk',
  WeightTraining = 'WeightTraining',
  Windsurf = 'Windsurf',
  Workout = 'Workout',
  Yoga = 'Yoga',
}

export interface StravaShortSummary {
   id: string,
   name: string,
   distance: number,
   movingTime: number,
   totalElevationGain: number,
   type: StravaActivityType,
   startDate: Date,
   startLatlng: [number, number] | null,
   endLatlng: [number, number] | null,
   map: StravaPolylineMap | null,
}

export interface OAuthResponse {
  access_token: string,
  refresh_token: string,
  expires_at: number,
}

export async function fetchActivitiesOrRoutes(type: string,
                                              access_token?: string,
                                              onProgress?: (actData: StravaShortSummary[]) => void,
                                              per_page = 50,
                                              after?: number): Promise<StravaShortSummary[]> {
  let actData = [];
  let page = 1;
  let actDataBatch;
  do {
    actDataBatch = await m.request<StravaShortSummary[]>({
      //url: `https://www.strava.com/api/v3/athlete/activities?per_page=${per_page}&page=${page}` + (after ? `&after=${after}` : ''),
      url: `http://localhost:8080/strava/${type}?per_page=${per_page}&page=${page}`,
      headers: {'Authorization': `Bearer ${access_token}`},
    });
    actData.push(...actDataBatch);
    page++;
    onProgress && onProgress(actData.slice());
  } while (actDataBatch.length === per_page);
  return actData;
}
// NOTE: { 'Accept': 'application/json+meta' } can be used to return a big list of IDs
