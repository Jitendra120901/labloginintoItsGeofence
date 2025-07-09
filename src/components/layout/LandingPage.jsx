import React from 'react';
import { motion } from 'framer-motion';
import { 
  SafetyOutlined as Shield,
  MobileOutlined as Smartphone,
  EnvironmentOutlined as MapPin,
  TeamOutlined as Users,
  LockOutlined as Lock,
  CheckCircleOutlined as CheckCircle
} from '@ant-design/icons';

// Main LandingPage component
const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Secure Lab Access
              </span>
              <br />
              with Advanced Authentication
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary geofence-based authentication system combining biometric passkeys 
              with precise location verification for ultimate laboratory security.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Get Started
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300"
              >
                Learn More
              </motion.button>
            </div>
          </motion.div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Shield className="text-6xl text-blue-500" />
          </motion.div>
        </div>
        <div className="absolute top-40 right-10 opacity-20">
          <motion.div
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Smartphone className="text-5xl text-purple-500" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Advanced Security Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our cutting-edge authentication system provides multiple layers of security 
              for your most sensitive laboratory environments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MapPin className="text-3xl" />}
              title="Geofence Authentication"
              description="Precise location verification ensures access only from authorized laboratory premises with real-time GPS tracking."
              gradient="from-green-500 to-emerald-600"
            />
            <FeatureCard
              icon={<Smartphone className="text-3xl" />}
              title="Biometric Passkeys"
              description="Passwordless authentication using your device's biometric sensors for ultimate security and convenience."
              gradient="from-blue-500 to-indigo-600"
            />
            <FeatureCard
              icon={<Shield className="text-3xl" />}
              title="Multi-Factor Security"
              description="Combining location, biometrics, and device verification for comprehensive protection against unauthorized access."
              gradient="from-purple-500 to-violet-600"
            />
          </div>
        </div>
      </section>

      {/* System Requirements Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              System Requirements
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ensure your devices meet these requirements for optimal security and performance.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                <Users className="inline mr-3 text-blue-600" />
                Desktop Requirements
              </h3>
              <ul className="space-y-4">
                <RequirementItem text="Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)" />
                <RequirementItem text="Stable internet connection for real-time authentication" />
                <RequirementItem text="Camera access for QR code scanning" />
                <RequirementItem text="Location services enabled for geofence verification" />
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                <Smartphone className="inline mr-3 text-purple-600" />
                Mobile Requirements
              </h3>
              <ul className="space-y-4">
                <RequirementItem text="iOS 14+ or Android 9+ with WebAuthn support" />
                <RequirementItem text="Biometric authentication (Face ID, Touch ID, Fingerprint)" />
                <RequirementItem text="High-accuracy GPS for precise location verification" />
                <RequirementItem text="Camera access for QR code scanning" />
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security Benefits */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Choose Our System?
            </h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Experience unparalleled security with our innovative approach to laboratory access control.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <BenefitCard
              icon={<Lock className="text-4xl" />}
              title="Zero Trust Security"
              description="Every access request is verified regardless of user or device history."
            />
            <BenefitCard
              icon={<MapPin className="text-4xl" />}
              title="Location Precision"
              description="Sub-meter accuracy ensures access only from designated areas."
            />
            <BenefitCard
              icon={<Smartphone className="text-4xl" />}
              title="Passwordless"
              description="Eliminate password vulnerabilities with biometric authentication."
            />
            <BenefitCard
              icon={<CheckCircle className="text-4xl" />}
              title="Audit Trail"
              description="Complete logging of all access attempts and locations."
            />
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Secure Your Lab?
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">
              Join the future of laboratory security with our advanced geofence-based authentication system.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Your Secure Journey
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, gradient }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
    whileHover={{ y: -10 }}
    className="relative group"
  >
    <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${gradient} text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

// Requirement Item Component
const RequirementItem = ({ text }) => (
  <motion.li
    initial={{ opacity: 0, x: -10 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="flex items-start"
  >
    <CheckCircle className="text-green-500 mr-3 mt-1 flex-shrink-0" />
    <span className="text-gray-700">{text}</span>
  </motion.li>
);

// Benefit Card Component
const BenefitCard = ({ icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    viewport={{ once: true }}
    whileHover={{ scale: 1.05 }}
    className="text-center"
  >
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="opacity-90 leading-relaxed">{description}</p>
  </motion.div>
);

export default LandingPage;