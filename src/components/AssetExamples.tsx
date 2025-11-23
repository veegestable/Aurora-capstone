// Aurora Assets - Example usage component
import * as React from 'react';

// Example of how to import and use assets in Aurora
// You can copy this pattern for your actual components

// Import logos
// import auroraLogo from '../assets/logos/aurora-logo.svg';
// import auroraIcon from '../assets/logos/aurora-icon.svg';

// Import icons  
// import moodHappy from '../assets/icons/mood-happy.svg';
// import moodSad from '../assets/icons/mood-sad.svg';
// import calendarIcon from '../assets/icons/calendar-icon.svg';

// Import images
// import heroImage from '../assets/images/hero-mental-health.png';
// import onboardingImg from '../assets/images/onboarding-1.png';

export const AssetExamples: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Aurora Assets Example</h2>

      {/* Logo Usage */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Logos</h3>
        {/* Uncomment when you add your logo files */}
        {/* <img src={auroraLogo} alt="Aurora Mental Health" className="h-12 mb-2" />
        <img src={auroraIcon} alt="Aurora Icon" className="h-8" /> */}
        <p className="text-gray-600 text-sm">Add your Aurora logo files to src/assets/logos/</p>
      </div>

      {/* Icon Usage */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Icons</h3>
        <div className="flex gap-3 items-center">
          {/* Uncomment when you add your icon files */}
          {/* <img src={moodHappy} alt="Happy" className="h-8 w-8" />
          <img src={moodSad} alt="Sad" className="h-8 w-8" />
          <img src={calendarIcon} alt="Calendar" className="h-8 w-8" /> */}
          <p className="text-gray-600 text-sm">Add mood and UI icons to src/assets/icons/</p>
        </div>
      </div>

      {/* Image Usage */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Images</h3>
        {/* Uncomment when you add your image files */}
        {/* <img src={heroImage} alt="Mental Health Hero" className="w-full max-w-md rounded" />
        <img src={onboardingImg} alt="Onboarding" className="w-32 h-32 object-cover rounded mt-3" /> */}
        <p className="text-gray-600 text-sm">Add hero images and illustrations to src/assets/images/</p>
      </div>

      {/* Public Assets Usage */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Public Assets</h3>
        <div className="space-y-2">
          {/* Example of using public folder assets */}
          <img src="/favicon.ico" alt="Favicon" className="h-8 w-8" />
          <p className="text-gray-600 text-sm">Public assets are accessed with / prefix</p>
          <code className="text-xs bg-gray-100 p-1 rounded">
            &lt;img src="/images/your-image.png" /&gt;
          </code>
        </div>
      </div>

      {/* Background Image Examples */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Background Images</h3>
        <div
          className="h-32 rounded-lg bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center"
        // Example: style={{ backgroundImage: 'url(/images/aurora-bg.jpg)' }}
        >
          <p className="text-white text-center">
            Add background images to public/images/<br />
            <span className="text-sm opacity-80">Use: style={`{backgroundImage: 'url(/images/bg.jpg)'}`}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssetExamples;