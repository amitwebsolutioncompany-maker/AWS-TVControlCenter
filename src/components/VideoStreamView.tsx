import React from 'react';
import { requireNativeComponent, UIManager, findNodeHandle } from 'react-native';

const VIEW_NAME = 'VideoStreamView';

export interface VideoStreamViewProps {
  streamUrl?: string;
  style?: any;
}

const NativeVideoStreamView = requireNativeComponent<VideoStreamViewProps>(VIEW_NAME);

export const VideoStreamView: React.FC<VideoStreamViewProps> = ({ streamUrl, style }) => {
  return <NativeVideoStreamView streamUrl={streamUrl} style={style} />;
};

export default VideoStreamView;
